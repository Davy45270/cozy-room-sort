import { describe, expect, it } from 'vitest';
import { applyAction, createInitialState, type GameState } from '../../../packages/engine/src/index.ts';
import { makeLevel, type MiniSpec } from './levels.ts';

const makeBlockedLevel = (rules: MiniSpec['rules']) => makeLevel({
    boxes: [['a', 1], ['b', 2]],
    objects: [['a1', 'a', ['b2']], ['b1', 'b'], ['b2', 'b']],
    rules: { bufferCapacity: 1, ...rules }
});

const select = (objectId: string) => ({ type: 'SELECT_OBJECT', objectId } as const);
const undo = { type: 'UNDO' } as const;

describe('R-006 : blocage et annulation', () => {
    it.each([
        ['quota nul', { allowUndo: true, undoLimit: 0 }],
        ['annulation désactivée', { allowUndo: false }]
    ] as const)('le blocage entraîne la défaite (%s)', (_name, rules) => {
        const level = makeBlockedLevel(rules);
        expect(applyAction(level, createInitialState(level), select('b1')).state.status).toBe('lost');
    });

    it('une position initiale sans coup légal et sans historique est perdue', () => {
        const level = makeBlockedLevel({ allowUndo: true, bufferCapacity: 0 });
        const initial = createInitialState(level);
        expect(initial.history).toEqual([]);
        expect(initial.status).toBe('lost');
    });

    it('une annulation disponible permet de reprendre une partie bloquée', () => {
        const level = makeBlockedLevel({ allowUndo: true, undoLimit: 1 });
        const initial = createInitialState(level);
        const blocked = applyAction(level, initial, select('b1')).state;
        expect(blocked.status).toBe('blocked');
        expect(applyAction(level, blocked, undo)).toEqual({
            state: { ...initial, undoCount: 1 },
            events: []
        });
    });

    it('un nouveau blocage entraîne la défaite après épuisement du quota', () => {
        const level = makeBlockedLevel({ allowUndo: true, undoLimit: 1 });
        const blocked = applyAction(level, createInitialState(level), select('b1')).state;
        const undone = applyAction(level, blocked, undo).state;
        expect(undone.undoCount).toBe(1);
        expect(applyAction(level, undone, select('b1')).state.status).toBe('lost');
    });

    it('une position bloquée restaurée entraîne la défaite si le quota est épuisé', () => {
        const level = makeBlockedLevel({ allowUndo: true, undoLimit: 1 });
        const initial = createInitialState(level);
        const { history, ...blocked } = applyAction(level, initial, select('b1')).state;
        const state: GameState = { ...initial, history: [...history, blocked] };
        const restored = applyAction(level, state, undo);
        expect(restored.events).toEqual([]);
        expect(restored.state).toMatchObject({ ...blocked, status: 'lost', undoCount: 1, history });
    });
});

describe('annulation après la fin de la partie', () => {
    it.each(['won', 'lost'] as const)('refuse sans mutation depuis une partie au statut %s', status => {
        const level = makeLevel({
            boxes: [['a', 2]],
            objects: [['a1', 'a'], ['a2', 'a']],
            rules: { allowUndo: true, timeLimitSeconds: 1 }
        });
        const playing = applyAction(level, createInitialState(level), select('a1')).state;
        const end = applyAction(level, playing, status === 'won' ? select('a2') : { type: 'TICK', ms: 1000 }).state;
        expect(end.status).toBe(status);
        expect(end.history.length).toBeGreaterThan(0);
        const result = applyAction(level, end, undo);
        expect(result.state).toBe(end);
        expect(result.events).toEqual([{ type: 'ACTION_REJECTED', reason: 'undo-unavailable' }]);
    });
});
