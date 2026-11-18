// Contrôleur de partie : applique les actions au moteur dans l'ordre, notifie l'affichage et sauvegarde par rejeu.
// Les sauvegardes forment une file : chacune attend la précédente, donc l'ordre sur disque est celui du jeu.
import { applyAction, createInitialState, recordAction, restore, snapshotOf, withMode,
    type GameAction, type GameEvent, type GameState, type Mode, type SavedGame } from '@cozy-room-sort/engine';
import type { Level } from '@cozy-room-sort/schemas';
import { hint as solverHint, HINT_BUDGET } from '@cozy-room-sort/solver';

export interface ControllerDeps { save: (save: SavedGame) => Promise<void>; now: () => number }
export type HintResult = { objectId: string } | { none: 'blocked' | 'not-found' | 'unavailable' };
export type Listener = (state: GameState, events: readonly GameEvent[]) => void;

export interface Controller {
    readonly level: Level;
    readonly state: GameState;
    select(objectId: string): void;
    undo(): void;
    restart(): void;
    hint(): HintResult;
    subscribe(listener: Listener): () => void;
    /** Résolu quand toutes les sauvegardes en file sont écrites. */
    idle(): Promise<void>;
}

/** Limite de temps de l'indice : au-delà, on préfère ne rien proposer que figer l'écran. */
export const HINT_MAX_MS = 300;

export function createController(baseLevel: Level, mode: Mode, deps: ControllerDeps, saved?: SavedGame): Controller {
    const level = withMode(baseLevel, mode);
    let record: SavedGame = { levelId: level.id, rulesVersion: level.rulesVersion, actions: [] };
    let state: GameState = createInitialState(level);
    if (saved) {
        const restored = restore(level, saved);
        if (!('error' in restored)) { state = restored; record = { ...saved, actions: [...saved.actions] }; }
    }
    const listeners = new Set<Listener>();
    let queue: Promise<void> = Promise.resolve();

    const persist = (): void => {
        const snapshot = record;
        queue = queue.then(() => deps.save(snapshot)).catch(() => undefined);
    };
    const dispatch = (action: GameAction): readonly GameEvent[] => {
        const transition = applyAction(level, state, action);
        if (transition.state === state && transition.events.some(e => e.type === 'ACTION_REJECTED')) {
            for (const l of listeners) l(state, transition.events);
            return transition.events;
        }
        state = transition.state;
        record = action.type === 'RESTART' ? { ...record, actions: [] } : recordAction(record, action);
        persist();
        for (const l of listeners) l(state, transition.events);
        return transition.events;
    };

    return {
        level,
        get state() { return state; },
        select: objectId => { dispatch({ type: 'SELECT_OBJECT', objectId }); },
        undo: () => { dispatch({ type: 'UNDO' }); },
        restart: () => { dispatch({ type: 'RESTART' }); },
        hint: () => {
            if (state.status === 'blocked') return { none: 'blocked' };
            if (!level.rules.allowHints || state.status !== 'playing' || state.hintCount >= (level.rules.hintLimit ?? Infinity)) return { none: 'unavailable' };
            const objectId = solverHint(level, snapshotOf(state), { ...HINT_BUDGET, maxMs: HINT_MAX_MS, now: deps.now });
            if (objectId === null) return { none: 'not-found' };
            dispatch({ type: 'HINT_USED' });
            return { objectId };
        },
        subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener); }; },
        idle: () => queue
    };
}
