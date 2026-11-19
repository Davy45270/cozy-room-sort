// Oracle : un TICK ne doit pas changer le statut d'une partie qui n'est plus en cours.
// Aujourd'hui le réducteur accepte un TICK en statut `blocked` et la fait passer à `lost` à l'échéance : le test
// marqué `it.fails` est donc vert tant que le défaut existe. Quand le moteur sera corrigé, il deviendra rouge : il
// faudra alors le passer en `it`.
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

    it.fails('un TICK ne change pas le statut d’une partie qui n’est pas en cours', () => {
        expect(run(blockedLevel, [late], run(blockedLevel, sel('b1'))).status).toBe('blocked');
        expect(run(wonLevel, [late], run(wonLevel, sel('a1', 'a2'))).status).toBe('won');
    });
});
