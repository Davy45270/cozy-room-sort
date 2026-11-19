import { describe, expect, it } from 'vitest';
import type { GameEvent, SavedGame } from '@cozy-room-sort/engine';
import { makeLevel } from '../engine/levels.ts';
import { createController } from '../../../apps/web/src/game/controller.ts';
import { signatureOf, type ReadableSave } from '../../../apps/web/src/game/save-signature.ts';
import { withMode } from '@cozy-room-sort/engine';

// a1 accessible ; b1 recouvre a2 ; carton a (2) puis carton b (1), un seul carton ouvert.
const level = makeLevel({ boxes: [['a', 2], ['b', 1]], objects: [['a1', 'a'], ['b1', 'b'], ['a2', 'a', ['b1']]], rules: { bufferCapacity: 1 }, stars: [1, 2] });

function setup(now: () => number = () => 0) {
    const saves: SavedGame[] = [];
    const controller = createController(level, 'detente', { save: s => { saves.push(s); return Promise.resolve(); }, now });
    const seen: GameEvent[][] = [];
    controller.subscribe((_s, events) => seen.push([...events]));
    return { controller, saves, seen };
}

describe('contrôleur de partie', () => {
    it('deux sélections rapides : deux transitions dans l\'ordre et deux sauvegardes', async () => {
        const { controller, saves, seen } = setup();
        controller.select('a1');
        controller.select('b1');
        await controller.idle();
        expect(seen.map(e => e.map(x => x.type))).toEqual([['OBJECT_PACKED'], ['OBJECT_BUFFERED']]);
        expect(saves.map(s => s.actions.length)).toEqual([1, 2]);
        expect(controller.state.bufferObjectIds).toEqual(['b1']);
    });

    it('un coup refusé ne sauvegarde rien', async () => {
        const { controller, saves } = setup();
        controller.select('a2');
        await controller.idle();
        expect(saves).toEqual([]);
    });

    it('l\'indice rend le premier coup d\'une meilleure solution', () => {
        const { controller } = setup();
        expect(controller.hint()).toEqual({ objectId: 'a1' });
        expect(controller.state.hintCount).toBe(1);
    });

    it('indice sur un état bloqué : « blocked »', () => {
        // Tampon d'une place, deux objets du second carton devant : bloqué dès que le premier y est.
        const stuck = makeLevel({ boxes: [['a', 1], ['b', 2]], objects: [['b1', 'b'], ['b2', 'b'], ['a1', 'a', ['b1', 'b2']]], rules: { bufferCapacity: 1 } });
        const c = createController(stuck, 'classique', { save: () => Promise.resolve(), now: () => 0 });
        c.select('b1');
        expect(c.state.status).toBe('blocked');
        expect(c.hint()).toEqual({ none: 'blocked' });
    });

    it('un chronomètre qui dépasse 300 ms rend « not-found »', () => {
        let t = 0;
        const { controller } = setup(() => (t += 400));
        expect(controller.hint()).toEqual({ none: 'not-found' });
    });

    it('une victoire notifie LEVEL_WON avec les étoiles, puis la sauvegarde est vidée', async () => {
        const { controller, seen, saves } = setup();
        for (const id of ['a1', 'b1', 'a2']) controller.select(id);
        await controller.idle();
        expect(controller.state.status).toBe('won');
        expect(seen.flat().find(e => e.type === 'LEVEL_WON')).toEqual({ type: 'LEVEL_WON', moveCount: 3, bufferedCount: 1, stars: 3 });
        expect(saves.at(-1)?.actions).toHaveLength(3);
    });

    it('annuler et recommencer passent par la même file', async () => {
        const { controller, saves } = setup();
        controller.select('b1');
        controller.undo();
        await controller.idle();
        expect(controller.state.bufferObjectIds).toEqual([]);
        controller.restart();
        await controller.idle();
        expect(saves.at(-1)?.actions).toEqual([]);
    });

    it('reprend une partie sauvegardée', async () => {
        const { controller, saves } = setup();
        controller.select('a1');
        await controller.idle();
        const c = createController(level, 'detente', { save: () => Promise.resolve(), now: () => 0 }, saves[0]);
        expect(c.state.moveCount).toBe(1);
    });
});

describe('refaire un coup', () => {
    it('rejoue uniquement la dernière sélection annulée et sauvegarde une sélection ordinaire', async () => {
        const { controller, saves } = setup();
        expect(controller.canRedo).toBe(false);
        controller.select('a1');
        controller.select('b1');
        controller.undo();
        expect(controller.canRedo).toBe(true);
        controller.redo();
        expect(controller.state.bufferObjectIds).toEqual(['b1']);
        expect(controller.canRedo).toBe(false);
        await controller.idle();
        expect(saves.at(-1)?.actions.at(-1)).toEqual({ type: 'SELECT_OBJECT', objectId: 'b1' });
    });

    it('une sélection acceptée efface le coup à refaire et un refus le préserve', () => {
        const { controller } = setup();
        controller.select('a1');
        controller.undo();
        controller.select('a2');
        expect(controller.canRedo).toBe(true);
        controller.select('b1');
        expect(controller.canRedo).toBe(false);
        controller.redo();
        expect(controller.state.moveCount).toBe(1);
    });
});

describe('journal invalide passé au contrôleur (défense en profondeur)', () => {
    const signed = (actions: unknown[]): ReadableSave => ({ levelId: level.id, rulesVersion: level.rulesVersion,
        levelSignature: signatureOf(withMode(level, 'detente')), actions: actions as ReadableSave['actions'] });
    it.each([[[null]], [[{ type: 'SELECT_OBJECT', objectId: 'a1' }, 7]], [[{ type: 'SELECT_OBJECT' }]], [[{ type: 'INCONNU' }]]])(
        'actions %j : partie neuve, sans exception', actions => {
            const controller = createController(level, 'detente', { save: () => Promise.resolve(), now: () => 0 }, signed(actions));
            expect(controller.state.moveCount).toBe(0);
            expect(controller.hasPlayed).toBe(false);
        });
});
