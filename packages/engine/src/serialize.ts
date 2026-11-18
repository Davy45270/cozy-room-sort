// Sauvegarde par rejeu : on garde la liste d'actions, pas l'état. Même niveau, mêmes règles ⇒ même état (R-010).
import type { Level } from '@cozy-room-sort/schemas';
import type { GameAction } from './actions.ts';
import type { GameTransition } from './events.ts';
import { applyAction } from './reducer.ts';
import { createInitialState, type GameState } from './state.ts';

export interface SavedGame { levelId: string; rulesVersion: string; actions: readonly GameAction[] }

export function replayActions(level: Level, actions: readonly GameAction[]): GameTransition {
    let transition: GameTransition = { state: createInitialState(level), events: [] };
    for (const action of actions) transition = applyAction(level, transition.state, action);
    return transition;
}

export function recordAction(save: SavedGame, action: GameAction): SavedGame {
    return { ...save, actions: [...save.actions, action] };
}

export function restore(level: Level, save: SavedGame): GameState | { error: string } {
    if (save.levelId !== level.id) return { error: `sauvegarde du niveau « ${save.levelId} », pas « ${level.id} »` };
    if (save.rulesVersion !== level.rulesVersion) return { error: `règles version ${save.rulesVersion}, niveau en version ${level.rulesVersion}` };
    return replayActions(level, save.actions).state;
}
