// Le réducteur conserve l’état hors d’une partie en cours. Un TICK à l’échéance laisse une partie bloquée en `blocked`.
import type { Level } from '@cozy-room-sort/schemas';
import { describe, expect, it } from 'vitest';
import { applyAction, createInitialState, type GameAction, type GameState } from '../../../packages/engine/src/index.ts';
import { makeLevel } from './levels.ts';

const run = (level: Level, actions: readonly GameAction[], from: GameState = createInitialState(level)): GameState =>
    actions.reduce((s, a) => applyAction(level, s, a).state, from);
const sel = (...ids: string[]): GameAction[] => ids.map(objectId => ({ type: 'SELECT_OBJECT', objectId }));

// Après b1, plus aucun coup légal ; l'annulation permise donne `blocked`. Limite de temps : 1 s.
const blockedLevel = makeLevel({ boxes: [['a', 2], ['b', 2]], objects: [['b1', 'b'], ['b2', 'b', ['b1']], ['a1', 'a', ['b2']], ['a2', 'a', ['a1']]],
    rules: { bufferCapacity: 1, allowUndo: true, timeLimitSeconds: 1 } });
const wonLevel = makeLevel({ boxes: [['a', 2]], objects: [['a1', 'a'], ['a2', 'a']], rules: { timeLimitSeconds: 1 } });
const late: GameAction = { type: 'TICK', ms: 5000 };

describe('TICK hors d’une partie en cours', () => {
    it('préparation de l’oracle : les deux parties sont bien `blocked` et `won`', () => {
        expect(run(blockedLevel, sel('b1')).status).toBe('blocked');
        expect(run(wonLevel, sel('a1', 'a2')).status).toBe('won');
    });

    it('un TICK ne change pas le statut d’une partie qui n’est pas en cours', () => {
        expect(run(blockedLevel, [late], run(blockedLevel, sel('b1'))).status).toBe('blocked');
        expect(run(wonLevel, [late], run(wonLevel, sel('a1', 'a2'))).status).toBe('won');
    });

    it('conserve le même état pour une partie bloquée, gagnée ou perdue', () => {
        const blocked = run(blockedLevel, sel('b1'));
        const won = run(wonLevel, sel('a1', 'a2'));
        const lost = run(wonLevel, [late]);
        expect(lost.status).toBe('lost');

        expect(run(blockedLevel, [late], blocked)).toBe(blocked);
        expect(run(wonLevel, [late], won)).toBe(won);
        expect(run(wonLevel, [late], lost)).toBe(lost);
    });
});
