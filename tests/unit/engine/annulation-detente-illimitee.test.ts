// En détente, « annulations à volonté » permet de revenir sur les coups conservés dans l'historique,
// quel que soit le nombre d'annulations déjà faites dans la partie.
import { describe, expect, it } from 'vitest';
import { applyAction, createInitialState, withMode, type GameAction, type GameState } from '../../../packages/engine/src/index.ts';
import { makeLevel } from './levels.ts';

const level = withMode(makeLevel({ boxes: [['a', 3]], objects: [['a1', 'a'], ['a2', 'a'], ['a3', 'a']] }), 'detente');
const apply = (s: GameState, a: GameAction) => applyAction(level, s, a);
const rejected = (events: readonly { type: string }[]) => events.some(e => e.type === 'ACTION_REJECTED');

describe('annulation en détente', () => {
    it('après 250 allers-retours, le dernier coup s’annule encore', () => {
        let s = createInitialState(level);
        for (let i = 0; i < 250; i++) {
            s = apply(s, { type: 'SELECT_OBJECT', objectId: 'a1' }).state;
            const t = apply(s, { type: 'UNDO' });
            expect(rejected(t.events)).toBe(false);
            s = t.state;
        }
        s = apply(s, { type: 'SELECT_OBJECT', objectId: 'a1' }).state;
        const last = apply(s, { type: 'UNDO' });
        expect(rejected(last.events)).toBe(false);
        expect(last.state.remainingObjectIds).toContain('a1');
    });
});
