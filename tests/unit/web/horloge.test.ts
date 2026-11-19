import { describe, expect, it } from 'vitest';
import type { SavedGame } from '@cozy-room-sort/engine';
import { makeLevel } from '../engine/levels.ts';
import { createController } from '../../../apps/web/src/game/controller.ts';
import { startClock, CLOCK_PERIOD_MS, type ClockTimers } from '../../../apps/web/src/game/clock.ts';

const spec = { boxes: [['a', 2]] as [string, number][], objects: [['a1', 'a'], ['a2', 'a']] as [string, string][] };

/** Minuterie pilotée à la main : chaque `fire` avance l'heure d'une période puis appelle le rappel. */
function manualTimers() {
    let now = 0;
    let callback: (() => void) | undefined;
    const calls = { set: 0, clear: 0 };
    const timers: ClockTimers = {
        now: () => now,
        setInterval: (fn, _ms) => { calls.set++; callback = fn; return 1; },
        clearInterval: () => { calls.clear++; callback = undefined; }
    };
    const fire = (ms = CLOCK_PERIOD_MS): void => { now += ms; callback?.(); };
    /** Le temps passe sans que la minuterie se déclenche (entre deux rappels). */
    const wait = (ms: number): void => { now += ms; };
    return { timers, calls, fire, wait, running: () => callback !== undefined };
}

describe('horloge de partie', () => {
    it('des rappels à l’heure fractionnaire transmettent des millisecondes entières : le journal se rejoue à l’identique', async () => {
        // Scénario de la relecture : 0,3 ms, un coup, puis 90,3 et 909,4 ms. En direct, la partie atteint la limite de 1 s ;
        // avec des durées fractionnaires fusionnées dans le journal, le rejeu restait juste sous la limite.
        const level = makeLevel({ ...spec, rules: { timeLimitSeconds: 1 } });
        const saves: SavedGame[] = [];
        const controller = createController(level, 'classique', { save: s => { saves.push(s); return Promise.resolve(); }, now: () => 0 });
        const { timers, fire, wait } = manualTimers();
        startClock(controller, timers);
        wait(0.3);
        controller.select('a1');
        fire(90.3);
        fire(909.4);
        expect(controller.state.status).toBe('lost');
        await controller.idle();
        const actions = saves.at(-1)?.actions ?? [];
        for (const action of actions) if (action.type === 'TICK') expect(Number.isInteger(action.ms)).toBe(true);
        const resumed = createController(level, 'classique', { save: () => Promise.resolve(), now: () => 0 }, saves.at(-1));
        expect(resumed.state.status).toBe(controller.state.status);
        expect(resumed.state.elapsedMs).toBe(controller.state.elapsedMs);
    });

    it('limite de 2 s : les TICK font perdre la partie, puis l’horloge s’arrête', async () => {
        const saves: SavedGame[] = [];
        const controller = createController(makeLevel({ ...spec, rules: { timeLimitSeconds: 2 } }), 'classique',
            { save: s => { saves.push(s); return Promise.resolve(); }, now: () => 0 });
        const { timers, calls, fire, running } = manualTimers();
        startClock(controller, timers);
        expect(calls.set).toBe(1);
        fire();
        expect(controller.state.status).toBe('playing');
        expect(controller.state.elapsedMs).toBe(1000);
        fire();
        expect(controller.state.status).toBe('lost');
        expect(running()).toBe(false);
        expect(calls.clear).toBe(1);
        await controller.idle();
        // Les TICK successifs sont fusionnés dans le journal : une seule action, rejouée à l'identique.
        expect(saves.at(-1)?.actions).toEqual([{ type: 'TICK', ms: 2000 }]);
        const resumed = createController(makeLevel({ ...spec, rules: { timeLimitSeconds: 2 } }), 'classique',
            { save: () => Promise.resolve(), now: () => 0 }, saves.at(-1));
        expect(resumed.state.status).toBe('lost');
    });

    it('sans limite de temps : aucune minuterie, aucun TICK', () => {
        const saves: SavedGame[] = [];
        const controller = createController(makeLevel(spec), 'classique', { save: s => { saves.push(s); return Promise.resolve(); }, now: () => 0 });
        const { timers, calls } = manualTimers();
        const stop = startClock(controller, timers);
        expect(calls.set).toBe(0);
        controller.tick(5000);
        expect(controller.state.elapsedMs).toBe(0);
        expect(saves).toEqual([]);
        stop();
        expect(calls.clear).toBe(0);
    });

    it('arrêt à la sortie de l’écran et à la victoire', () => {
        const level = makeLevel({ ...spec, rules: { timeLimitSeconds: 60 } });
        const controller = createController(level, 'classique', { save: () => Promise.resolve(), now: () => 0 });
        const first = manualTimers();
        const stop = startClock(controller, first.timers);
        stop();
        expect(first.running()).toBe(false);
        const second = manualTimers();
        startClock(controller, second.timers);
        controller.select('a1');
        controller.select('a2');
        expect(controller.state.status).toBe('won');
        second.fire();
        expect(second.running()).toBe(false);
        expect(controller.state.elapsedMs).toBe(0);
    });

    it('un rappel en retard transmet le temps réellement écoulé, pas la période', () => {
        const controller = createController(makeLevel({ ...spec, rules: { timeLimitSeconds: 10 } }), 'classique',
            { save: () => Promise.resolve(), now: () => 0 });
        const { timers, fire } = manualTimers();
        startClock(controller, timers);
        fire(2500);
        expect(controller.state.elapsedMs).toBe(2500);
        fire(400);
        expect(controller.state.elapsedMs).toBe(2900);
    });

    it('« Recommencer » après l’échéance relance l’horloge, jusqu’à une nouvelle défaite', () => {
        const controller = createController(makeLevel({ ...spec, rules: { timeLimitSeconds: 1 } }), 'classique',
            { save: () => Promise.resolve(), now: () => 0 });
        const { timers, calls, fire, wait, running } = manualTimers();
        startClock(controller, timers);
        fire();
        expect(controller.state.status).toBe('lost');
        expect(running()).toBe(false);
        wait(30_000);
        controller.restart();
        expect(controller.state.status).toBe('playing');
        expect(controller.state.elapsedMs).toBe(0);
        expect(running()).toBe(true);
        expect(calls.set).toBe(2);
        // Les 30 s passées sur l'écran de défaite ne sont pas ajoutées : le temps repart de « Recommencer ».
        fire(400);
        expect(controller.state.elapsedMs).toBe(400);
        expect(controller.state.status).toBe('playing');
        fire(600);
        expect(controller.state.status).toBe('lost');
        expect(running()).toBe(false);
    });

    it('« Recommencer » en cours de partie : le temps de la partie abandonnée n’est pas reporté', () => {
        const controller = createController(makeLevel({ ...spec, rules: { timeLimitSeconds: 5 } }), 'classique',
            { save: () => Promise.resolve(), now: () => 0 });
        const { timers, fire, wait } = manualTimers();
        startClock(controller, timers);
        fire();
        wait(800);
        controller.restart();
        fire(200);
        expect(controller.state.elapsedMs).toBe(200);
    });

    it('un coup joué après l’échéance, avant le rappel suivant, ne gagne pas', () => {
        const controller = createController(makeLevel({ ...spec, rules: { timeLimitSeconds: 1 } }), 'classique',
            { save: () => Promise.resolve(), now: () => 0 });
        const { timers, wait } = manualTimers();
        startClock(controller, timers);
        controller.select('a1');
        wait(1500);
        controller.select('a2');
        expect(controller.state.status).toBe('lost');
        expect(controller.state.elapsedMs).toBe(1500);
        expect(controller.state.remainingObjectIds).toEqual(['a2']);
    });

    it('un coup joué avant l’échéance ajoute d’abord le temps écoulé, puis s’applique', () => {
        const controller = createController(makeLevel({ ...spec, rules: { timeLimitSeconds: 2 } }), 'classique',
            { save: () => Promise.resolve(), now: () => 0 });
        const { timers, wait } = manualTimers();
        startClock(controller, timers);
        wait(700);
        controller.select('a1');
        expect(controller.state.elapsedMs).toBe(700);
        expect(controller.state.remainingObjectIds).toEqual(['a2']);
    });

    it('arrêtée, l’horloge n’ajoute plus aucun temps, même avant un coup', () => {
        const controller = createController(makeLevel({ ...spec, rules: { timeLimitSeconds: 1 } }), 'classique',
            { save: () => Promise.resolve(), now: () => 0 });
        const { timers, wait, running } = manualTimers();
        const stop = startClock(controller, timers);
        stop();
        wait(5000);
        controller.select('a1');
        controller.restart();
        expect(running()).toBe(false);
        expect(controller.state.elapsedMs).toBe(0);
        expect(controller.state.status).toBe('playing');
    });
});
