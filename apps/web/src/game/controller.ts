// Contrôleur de partie : applique les actions au moteur dans l'ordre, notifie l'affichage et sauvegarde par rejeu.
// Les sauvegardes forment une file : chacune attend la précédente, donc l'ordre sur disque est celui du jeu.
import { applyAction, createInitialState, recordAction, replayActions, restore, isAccessible, snapshotOf, withMode,
    type GameAction, type GameEvent, type GameState, type Mode } from '@cozy-room-sort/engine';
import type { Level } from '@cozy-room-sort/schemas';
import { hint as solverHint, HINT_BUDGET } from '@cozy-room-sort/solver';
import { isGameAction, signatureOf, type ReadableSave, type SignedSave } from './save-signature.ts';

export interface ControllerDeps { save: (save: SignedSave) => Promise<void>; now: () => number }
export type HintResult = { objectId: string } | { none: 'blocked' | 'not-found' | 'unavailable' };
export type Listener = (state: GameState, events: readonly GameEvent[]) => void;

export interface Controller {
    readonly level: Level;
    readonly state: GameState;
    readonly canRedo: boolean;
    readonly hasPlayed: boolean;
    isObjectAccessible(id: string): boolean;
    select(objectId: string): void;
    undo(): void;
    redo(): void;
    restart(): void;
    /** Temps écoulé, pour un niveau chronométré : sans limite de temps ou partie finie, rien n'est fait. */
    tick(ms: number): void;
    hint(): HintResult;
    subscribe(listener: Listener): () => void;
    /** Résolu quand toutes les sauvegardes en file sont écrites. */
    idle(): Promise<void>;
}

/** Limite de temps de l'indice : au-delà, on préfère ne rien proposer que figer l'écran. */
export const HINT_MAX_MS = 300;

export function createController(baseLevel: Level, mode: Mode, deps: ControllerDeps, saved?: ReadableSave): Controller {
    const level = withMode(baseLevel, mode);
    const levelSignature = signatureOf(level);
    let record: SignedSave = { levelId: level.id, rulesVersion: level.rulesVersion, levelSignature, actions: [] };
    let state: GameState = createInitialState(level);
    let redoId: string | undefined;
    const recoveredObject = (before: GameState, after: GameState): string | undefined =>
        after.remainingObjectIds.find(id => !before.remainingObjectIds.includes(id));

    const objectIds = new Set(level.objects.map(object => object.id));
    // Défense en profondeur : une action illisible passée malgré le stockage donne une partie neuve, jamais une exception.
    const actions: unknown = saved?.actions;
    if (saved?.levelSignature === levelSignature && Array.isArray(actions)
        && actions.every((action: unknown) => isGameAction(action) && (action.type !== 'SELECT_OBJECT' || objectIds.has(action.objectId)))) {
        const restored = restore(level, saved);
        if (!('error' in restored)) {
            state = restored;
            record = { ...saved, levelSignature, actions: [...saved.actions] };
            let lastMove = record.actions.length - 1;
            while (record.actions[lastMove]?.type === 'HINT_USED' || record.actions[lastMove]?.type === 'TICK') lastMove--;
            if (record.actions[lastMove]?.type === 'UNDO') {
                const before = replayActions(level, record.actions.slice(0, lastMove)).state;
                redoId = recoveredObject(before, state);
            }
        }
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
        if (action.type === 'UNDO') redoId = recoveredObject(state, transition.state);
        if (action.type === 'SELECT_OBJECT' || action.type === 'RESTART') redoId = undefined;
        state = transition.state;
        const previous = record.actions.at(-1);
        // Deux TICK consécutifs se fusionnent : le journal ne grossit pas à chaque seconde, et le rejeu donne le même état.
        record = action.type === 'RESTART' ? { ...record, actions: [] }
            : action.type === 'TICK' && previous?.type === 'TICK'
                ? { ...record, levelSignature, actions: [...record.actions.slice(0, -1), { type: 'TICK', ms: previous.ms + action.ms }] }
                : { ...recordAction(record, action), levelSignature };
        persist();
        for (const l of listeners) l(state, transition.events);
        return transition.events;
    };

    return {
        level,
        get state() { return state; },
        get canRedo() { return redoId !== undefined; },
        get hasPlayed() { return record.actions.some(action => action.type === 'SELECT_OBJECT'); },
        isObjectAccessible: id => isAccessible(level, state, id),
        select: objectId => { dispatch({ type: 'SELECT_OBJECT', objectId }); },
        undo: () => { dispatch({ type: 'UNDO' }); },
        redo: () => { if (redoId !== undefined) dispatch({ type: 'SELECT_OBJECT', objectId: redoId }); },
        restart: () => { dispatch({ type: 'RESTART' }); },
        tick: ms => {
            if (level.rules.timeLimitSeconds === null || state.status === 'won' || state.status === 'lost' || !(ms > 0)) return;
            dispatch({ type: 'TICK', ms });
        },
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
