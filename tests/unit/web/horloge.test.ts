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
    return { timers, calls, fire, running: () => callback !== undefined };
}

describe('horloge de partie', () => {
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
});
