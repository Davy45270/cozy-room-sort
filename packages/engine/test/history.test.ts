import type { Level } from '@cozy-room-sort/schemas';
import { describe, expect, it } from 'vitest';
import { applyAction, createInitialState, withMode, type GameAction, type GameState } from '../src/index.ts';
import { makeLevel, type MiniSpec } from './levels.ts';

const run = (level: Level, actions: readonly GameAction[], from: GameState = createInitialState(level)): GameState =>
    actions.reduce((s, a) => applyAction(level, s, a).state, from);
const sel = (...ids: string[]): GameAction[] => ids.map(objectId => ({ type: 'SELECT_OBJECT', objectId }));
const books: MiniSpec = { boxes: [['books', 6]], objects: ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'].map(id => [id, 'books'] as const) };

describe('vidage du tampon', () => {
    it('T-005 : cascade, le nouveau carton prend ce qui attend dans le tampon, dans l\'ordre d\'arrivée', () => {
        const level = makeLevel({
            boxes: [['books', 3], ['plants', 1], ['books', 1]],
            objects: [['l1', 'books'], ['l2', 'books'], ['p1', 'plants'], ['l4', 'books'], ['l3', 'books']],
            rules: { bufferCapacity: 3 }
        });
        const state = run(level, sel('l1', 'l2', 'p1'));
        expect(state.bufferObjectIds).toEqual(['p1']);
        const { state: after, events } = applyAction(level, state, { type: 'SELECT_OBJECT', objectId: 'l3' });
        expect(events).toEqual([
            { type: 'OBJECT_PACKED', objectId: 'l3', boxId: 'box-1', fromBuffer: false },
            { type: 'BOX_COMPLETED', boxId: 'box-1' },
            { type: 'BOX_ACTIVATED', boxId: 'box-2', slot: 0 },
            { type: 'OBJECT_PACKED', objectId: 'p1', boxId: 'box-2', fromBuffer: true },
            { type: 'BOX_COMPLETED', boxId: 'box-2' },
            { type: 'BOX_ACTIVATED', boxId: 'box-3', slot: 0 }
        ]);
        expect(after.bufferObjectIds).toEqual([]);
        expect(after.activeBoxIds).toEqual(['box-3']);
    });

    it('le tampon se vide dans l\'ordre d\'arrivée et garde ce qui ne convient pas', () => {
        const level = makeLevel({
            boxes: [['a', 1], ['b', 1], ['c', 1]],
            objects: [['a1', 'a', ['c1']], ['c1', 'c'], ['b1', 'b']],
            rules: { bufferCapacity: 3 }
        });
        const state = run(level, sel('c1', 'b1'));
        expect(state.bufferObjectIds).toEqual(['c1', 'b1']);
        const { state: after, events } = applyAction(level, state, { type: 'SELECT_OBJECT', objectId: 'a1' });
        expect(events.flatMap(e => e.type === 'OBJECT_PACKED' ? [e.objectId] : [])).toEqual(['a1', 'b1', 'c1']);
        expect(after.status).toBe('won');
    });
});

describe('UNDO, RESTART, TICK, HINT_USED', () => {
    it('T-007 : UNDO rend l\'état précédent', () => {
        const level = makeLevel(books);
        const before = run(level, sel('b1'));
        const after = run(level, [...sel('b2'), { type: 'UNDO' }], before);
        expect(after).toEqual({ ...before, undoCount: 1 });
    });

    it('UNDO après une victoire repasse en jeu, et rejouer réémet LEVEL_WON', () => {
        const level = makeLevel({ boxes: [['books', 2]], objects: [['b1', 'books'], ['b2', 'books']] });
        const won = run(level, sel('b1', 'b2'));
        expect(won.status).toBe('won');
        const undone = applyAction(level, won, { type: 'UNDO' }).state;
        expect(undone.status).toBe('playing');
        const again = applyAction(level, undone, { type: 'SELECT_OBJECT', objectId: 'b2' });
        expect(again.events.filter(e => e.type === 'LEVEL_WON')).toHaveLength(1);
    });

    it.each([
        ['historique vide', makeLevel(books), 0],
        ['mode expert', withMode(makeLevel(books), 'expert'), 1]
    ] as const)('UNDO refusé (%s), état inchangé', (_name, level, moves) => {
        const state = run(level, sel('b1').slice(0, moves));
        const t = applyAction(level, state, { type: 'UNDO' });
        expect(t.state).toBe(state);
        expect(t.events).toEqual([{ type: 'ACTION_REJECTED', reason: 'undo-unavailable' }]);
    });

    it('mode classique : le 4e UNDO est refusé', () => {
        const level = withMode(makeLevel(books), 'classique');
        let state = run(level, sel('b1', 'b2', 'b3', 'b4', 'b5'));
        for (let i = 0; i < 3; i++) state = run(level, [{ type: 'UNDO' }], state);
        expect(state.undoCount).toBe(3);
        expect(applyAction(level, state, { type: 'UNDO' }).events).toEqual([{ type: 'ACTION_REJECTED', reason: 'undo-unavailable' }]);
    });

    it('R-008 : mode détente, 10 annulations successives', () => {
        const level = withMode(makeLevel({ boxes: [['books', 12]], objects: Array.from({ length: 12 }, (_, i) => [`b${i}`, 'books'] as const) }), 'detente');
        let state = run(level, sel(...Array.from({ length: 11 }, (_, i) => `b${i}`)));
        for (let i = 0; i < 10; i++) {
            const t = applyAction(level, state, { type: 'UNDO' });
            expect(t.events).toEqual([]);
            state = t.state;
        }
        expect(state.moveCount).toBe(1);
    });

    it('RESTART rend l\'état initial', () => {
        const level = makeLevel(books);
        const state = run(level, [...sel('b1', 'b2'), { type: 'UNDO' }, { type: 'HINT_USED' }, { type: 'RESTART' }]);
        expect(state).toEqual(createInitialState(level));
    });

    it('TICK avance le temps sans toucher à l\'historique, et la limite de temps fait perdre', () => {
        const level = makeLevel({ ...books, rules: { timeLimitSeconds: 1 } });
        const one = run(level, [{ type: 'TICK', ms: 600 }]);
        expect(one.elapsedMs).toBe(600);
        expect(one.history).toEqual([]);
        expect(one.status).toBe('playing');
        expect(run(level, [{ type: 'TICK', ms: 600 }], one).status).toBe('lost');
    });

    it('HINT_USED compte les indices et respecte la limite', () => {
        const level = withMode(makeLevel(books), 'classique');
        const state = run(level, [{ type: 'HINT_USED' }, { type: 'HINT_USED' }, { type: 'HINT_USED' }]);
        expect(state.hintCount).toBe(3);
        expect(applyAction(level, state, { type: 'HINT_USED' }).events).toEqual([{ type: 'ACTION_REJECTED', reason: 'not-playing' }]);
        const expert = withMode(makeLevel(books), 'expert');
        expect(applyAction(expert, createInitialState(expert), { type: 'HINT_USED' }).events[0]?.type).toBe('ACTION_REJECTED');
    });

    it('withMode applique les valeurs de départ et ne touche pas au niveau d\'origine', () => {
        const level = makeLevel(books);
        expect(withMode(level, 'detente').rules).toMatchObject({ bufferCapacity: 4, undoLimit: 200, allowUndo: true });
        expect(withMode(level, 'classique').rules).toMatchObject({ bufferCapacity: 3, undoLimit: 3, hintLimit: 3 });
        expect(withMode(level, 'expert').rules).toMatchObject({ allowUndo: false, allowHints: false });
        expect(level.rules.undoLimit).toBeUndefined();
    });
});
