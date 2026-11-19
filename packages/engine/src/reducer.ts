// Fonction centrale : applyAction(level, state, action). Ne modifie jamais ses arguments.
import type { Level } from '@cozy-room-sort/schemas';
import type { GameAction } from './actions.ts';
import type { GameTransition, RejectReason } from './events.ts';
import { statusOf, step } from './rules.ts';
import { createInitialState, snapshotOf, type GameState } from './state.ts';

/** Plafond de l'historique, contre l'emballement de la mémoire. */
export const HISTORY_CAP = 200;

const reject = (state: GameState, reason: RejectReason): GameTransition =>
    ({ state, events: [{ type: 'ACTION_REJECTED', reason }] });

function undoTarget(rules: Level['rules'], state: GameState) {
    if (state.status === 'lost') return undefined;
    if (!rules.allowUndo || state.undoCount >= (rules.undoLimit ?? Infinity)) return undefined;
    return state.history.at(-1);
}

export function applyAction(level: Level, state: GameState, action: GameAction): GameTransition {
    const rules = level.rules;
    switch (action.type) {
        case 'SELECT_OBJECT': {
            const result = step(level, snapshotOf(state), action.objectId);
            if ('rejected' in result) return reject(state, result.rejected);
            const cap = Math.min(rules.undoLimit ?? HISTORY_CAP, HISTORY_CAP);
            const history = cap <= 0 ? [] : [...state.history, snapshotOf(state)].slice(-cap);
            const next = { ...result.snapshot, history };
            if (next.status === 'lost' && undoTarget(rules, { ...next, status: 'blocked' }) !== undefined) {
                next.status = 'blocked';
            }
            return { state: next, events: result.events };
        }
        case 'UNDO': {
            const previous = undoTarget(rules, state);
            if (previous === undefined) return reject(state, 'undo-unavailable');
            const restored = {
                ...previous, undoCount: state.undoCount + 1, hintCount: state.hintCount,
                elapsedMs: state.elapsedMs, history: state.history.slice(0, -1)
            };
            restored.status = statusOf(level, restored, undoTarget(rules, restored) !== undefined);
            return { state: restored, events: [] };
        }
        case 'RESTART':
            return { state: createInitialState(level), events: [] };
        case 'HINT_USED':
            if (!rules.allowHints || state.status !== 'playing' || state.hintCount >= (rules.hintLimit ?? Infinity)) return reject(state, 'not-playing');
            return { state: { ...state, hintCount: state.hintCount + 1 }, events: [] };
        case 'TICK': {
            if (state.status !== 'playing' || action.ms <= 0) return { state, events: [] };
            const elapsedMs = state.elapsedMs + action.ms;
            const limit = rules.timeLimitSeconds;
            const status = limit !== null && elapsedMs >= limit * 1000 ? 'lost' : state.status;
            return { state: { ...state, elapsedMs, status }, events: [] };
        }
    }
}
