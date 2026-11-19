import { describe, expect, it } from 'vitest';
import { applyAction, createInitialState, isAccessible, legalMoves, starsFor, type GameState } from '../../../packages/engine/src/index.ts';
import { makeLevel, type MiniSpec } from './levels.ts';

const play = (spec: MiniSpec, ...ids: string[]) => {
    const level = makeLevel(spec);
    let state: GameState = createInitialState(level);
    for (const id of ids) {
        const t = applyAction(level, state, { type: 'SELECT_OBJECT', objectId: id });
        expect(t.events[0]?.type).not.toBe('ACTION_REJECTED');
        state = t.state;
    }
    return { level, state, select: (id: string) => applyAction(level, state, { type: 'SELECT_OBJECT', objectId: id }) };
};

const books3 = { boxes: [['books', 3], ['plants', 1]], objects: [['b1', 'books'], ['b2', 'books'], ['b3', 'books'], ['p1', 'plants']] } as const satisfies MiniSpec;

describe('SELECT_OBJECT', () => {
    it('T-001 / R-002 : un objet compatible incrémente le carton', () => {
        const { select } = play(books3);
        const { state, events } = select('b1');
        expect(state.boxFillCounts['box-1']).toBe(1);
        expect(state.packedIn['b1']).toBe('box-1');
        expect(events).toEqual([{ type: 'OBJECT_PACKED', objectId: 'b1', boxId: 'box-1', fromBuffer: false }]);
        expect(state.moveCount).toBe(1);
    });

    it('T-002 / R-003 : un objet incompatible va au tampon', () => {
        const { select } = play(books3);
        const { state, events } = select('p1');
        expect(state.bufferObjectIds).toEqual(['p1']);
        expect(events).toEqual([{ type: 'OBJECT_BUFFERED', objectId: 'p1' }]);
    });

    it('T-003 / R-006 : tampon plein et objet incompatible, coup refusé sans mutation', () => {
        const spec: MiniSpec = { boxes: [['books', 1], ['plants', 1], ['toys', 1]], objects: [['b1', 'books'], ['p1', 'plants'], ['t1', 'toys']], rules: { bufferCapacity: 1 } };
        const { state, select } = play(spec, 'p1');
        const t = select('t1');
        expect(t.state).toBe(state);
        expect(t.events).toEqual([{ type: 'ACTION_REJECTED', reason: 'buffer-full' }]);
    });

    it('T-004 / R-004 : un carton plein se ferme et le suivant s\'active au même emplacement', () => {
        const { select } = play({ boxes: [['books', 3], ['books', 1]], objects: [['b1', 'books'], ['b2', 'books'], ['b3', 'books'], ['b4', 'books']] }, 'b1', 'b2');
        const { state, events } = select('b3');
        expect(events).toEqual([
            { type: 'OBJECT_PACKED', objectId: 'b3', boxId: 'box-1', fromBuffer: false },
            { type: 'BOX_COMPLETED', boxId: 'box-1' },
            { type: 'BOX_ACTIVATED', boxId: 'box-2', slot: 0 }
        ]);
        expect(state.activeBoxIds).toEqual(['box-2']);
        expect(state.completedBoxIds).toEqual(['box-1']);
    });

    it('T-011 / R-001 : un objet masqué sous un autre n\'est pas sélectionnable', () => {
        const spec: MiniSpec = { boxes: [['books', 2]], objects: [['b1', 'books'], ['b2', 'books', ['b1'], true]] };
        const { level, state, select } = play(spec);
        expect(select('b2')).toEqual({ state, events: [{ type: 'ACTION_REJECTED', reason: 'not-accessible' }] });
        const after = applyAction(level, state, { type: 'SELECT_OBJECT', objectId: 'b1' }).state;
        expect(isAccessible(level, after, 'b2')).toBe(true);
    });

    it('va au premier emplacement compatible, puis au second quand le premier est plein', () => {
        const spec: MiniSpec = { boxes: [['books', 3], ['books', 3]], objects: ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'].map(id => [id, 'books'] as const), rules: { activeBoxCount: 2 } };
        const { state } = play(spec, 'b1', 'b2', 'b3', 'b4');
        expect(['b1', 'b2', 'b3'].map(id => state.packedIn[id])).toEqual(['box-1', 'box-1', 'box-1']);
        expect(state.packedIn['b4']).toBe('box-2');
        expect(state.activeBoxIds).toEqual(['box-2']);
    });

    it.each(['b1', 'inconnu'])('refuse « %s » (déjà rangé ou inconnu) sans mutation', id => {
        const { state, select } = play(books3, 'b1');
        const t = select(id);
        expect(t.state).toBe(state);
        expect(t.events).toEqual([{ type: 'ACTION_REJECTED', reason: 'not-accessible' }]);
    });

    it('T-006 / R-007 : le dernier objet rangé donne la victoire, une seule fois, avec les étoiles', () => {
        const spec: MiniSpec = { boxes: [['books', 2]], objects: [['b1', 'books'], ['b2', 'books']], stars: [0, 1] };
        const { select } = play(spec, 'b1');
        const { state, events } = select('b2');
        expect(state.status).toBe('won');
        expect(events.filter(e => e.type === 'LEVEL_WON')).toEqual([{ type: 'LEVEL_WON', moveCount: 2, bufferedCount: 0, stars: 3 }]);
    });

    it('étoiles : comptées en passages par le tampon', () => {
        const spec: MiniSpec = { boxes: [['a', 1], ['b', 1], ['c', 1]], objects: [['a1', 'a'], ['b1', 'b'], ['c1', 'c']], stars: [0, 1] };
        const cases = [
            { order: ['a1', 'b1', 'c1'], passes: 0, stars: 3 },
            { order: ['b1', 'a1', 'c1'], passes: 1, stars: 2 },
            { order: ['c1', 'b1', 'a1'], passes: 2, stars: 1 }
        ];
        for (const { order, passes, stars } of cases) {
            const { level, select } = play(spec, ...order.slice(0, -1));
            const { state, events } = select(order.at(-1)!);
            expect(state.status).toBe('won');
            expect(state.moveCount).toBe(3);
            expect(state.bufferedCount).toBe(passes);
            expect(starsFor(level, state.bufferedCount)).toBe(stars);
            expect(events).toContainEqual({ type: 'LEVEL_WON', moveCount: 3, bufferedCount: passes, stars });
        }
    });

    it('refuse tout coup après la victoire', () => {
        const spec: MiniSpec = { boxes: [['books', 1], ['plants', 1]], objects: [['b1', 'books'], ['p1', 'plants']], rules: { activeBoxCount: 2 } };
        const { state, select } = play(spec, 'b1', 'p1');
        expect(state.status).toBe('won');
        expect(select('p1').events).toEqual([{ type: 'ACTION_REJECTED', reason: 'not-playing' }]);
    });

    it.each([[true, 'blocked'], [false, 'lost']] as const)('sans coup légal : allowUndo %s donne %s', (allowUndo, status) => {
        const spec: MiniSpec = { boxes: [['a', 2], ['b', 2]], objects: [['b1', 'b'], ['b2', 'b', ['b1']], ['a1', 'a', ['b2']], ['a2', 'a', ['a1']]], rules: { bufferCapacity: 1, allowUndo } };
        const { level, state } = play(spec, 'b1');
        expect(state.status).toBe(status);
        expect(legalMoves(level, state)).toEqual([]);
    });

    it('moveCount n\'augmente que sur un coup accepté', () => {
        const { state, select } = play(books3, 'b1');
        expect(select('b1').state.moveCount).toBe(state.moveCount);
        expect(select('b2').state.moveCount).toBe(state.moveCount + 1);
    });
});
