import { describe, expect, it } from 'vitest';
import { applyAction, createInitialState, recordAction, replayActions, restore, type GameAction, type SavedGame } from '../../../packages/engine/src/index.ts';
import { makeLevel } from './levels.ts';

const level = makeLevel({ boxes: [['books', 2], ['plants', 1]], objects: [['b1', 'books'], ['p1', 'plants', ['b1']], ['b2', 'books']] });
const actions: GameAction[] = [
    { type: 'SELECT_OBJECT', objectId: 'b1' }, { type: 'SELECT_OBJECT', objectId: 'p1' }, { type: 'UNDO' },
    { type: 'TICK', ms: 250 }, { type: 'SELECT_OBJECT', objectId: 'p1' }, { type: 'HINT_USED' }
];

describe('sauvegarde par rejeu', () => {
    it('T-008 / R-010 : mêmes niveau et actions, même résultat', () => {
        expect(replayActions(level, actions)).toEqual(replayActions(level, actions));
    });

    it('T-010 : restaurer une sauvegarde rend l\'état identique', () => {
        let state = createInitialState(level);
        let save: SavedGame = { levelId: level.id, rulesVersion: '1', actions: [] };
        for (const action of actions) {
            state = applyAction(level, state, action).state;
            save = recordAction(save, action);
        }
        expect(restore(level, save)).toEqual(state);
    });

    it('refuse une sauvegarde d\'un autre niveau ou d\'autres règles', () => {
        expect(restore(level, { levelId: 'autre', rulesVersion: '1', actions })).toHaveProperty('error');
        expect(restore(level, { levelId: level.id, rulesVersion: '2', actions })).toHaveProperty('error');
    });
});
