// Fonction centrale : applyAction(level, state, action). Ne modifie jamais ses arguments.
import type { Level } from '@cozy-room-sort/schemas';
import type { GameAction } from './actions.ts';
import type { GameTransition, RejectReason } from './events.ts';
import { step } from './rules.ts';
import { createInitialState, snapshotOf, type GameState } from './state.ts';

/** Plafond de l'historique, contre l'emballement de la mémoire. */
export const HISTORY_CAP = 200;

const reject = (state: GameState, reason: RejectReason): GameTransition =>
    ({ state, events: [{ type: 'ACTION_REJECTED', reason }] });

export function applyAction(level: Level, state: GameState, action: GameAction): GameTransition {
    const rules = level.rules;
    switch (action.type) {
        case 'SELECT_OBJECT': {
            const result = step(level, snapshotOf(state), action.objectId);
            if ('rejected' in result) return reject(state, result.rejected);
            const cap = Math.min(rules.undoLimit ?? HISTORY_CAP, HISTORY_CAP);
            const history = cap <= 0 ? [] : [...state.history, snapshotOf(state)].slice(-cap);
            return { state: { ...result.snapshot, history }, events: result.events };
        }
        case 'UNDO': {
            const previous = state.history.at(-1);
            if (!rules.allowUndo || previous === undefined || state.undoCount >= (rules.undoLimit ?? Infinity)) return reject(state, 'undo-unavailable');
            return {
                state: { ...previous, undoCount: state.undoCount + 1, hintCount: state.hintCount, elapsedMs: state.elapsedMs, history: state.history.slice(0, -1) },
                events: []
            };
        }
        case 'RESTART':
            return { state: createInitialState(level), events: [] };
        case 'HINT_USED':
            if (!rules.allowHints || state.status !== 'playing' || state.hintCount >= (rules.hintLimit ?? Infinity)) return reject(state, 'not-playing');
            return { state: { ...state, hintCount: state.hintCount + 1 }, events: [] };
        case 'TICK': {
            if (state.status === 'won' || state.status === 'lost' || action.ms <= 0) return { state, events: [] };
            const elapsedMs = state.elapsedMs + action.ms;
            const limit = rules.timeLimitSeconds;
            const status = limit !== null && elapsedMs >= limit * 1000 ? 'lost' : state.status;
            return { state: { ...state, elapsedMs, status }, events: [] };
        }
    }
}
