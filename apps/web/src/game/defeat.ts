// Motif d'une partie perdue, dit au joueur : il nomme la cause réelle (temps écoulé, annulations épuisées, mode sans
// annulation), sans supposer le mode de jeu.
import type { GameState } from '@cozy-room-sort/engine';
import type { Level } from '@cozy-room-sort/schemas';

export function defeatReason(rules: Level['rules'], state: GameState): string {
    if (rules.timeLimitSeconds !== null && state.elapsedMs >= rules.timeLimitSeconds * 1000) return 'Le temps est écoulé.';
    if (!rules.allowUndo) return 'Il ne reste aucun coup possible, et ce mode ne permet pas d’annuler.';
    if (state.undoCount >= (rules.undoLimit ?? Infinity)) return 'Il ne reste aucun coup possible, et toutes tes annulations sont utilisées.';
    return 'Il ne reste aucun coup possible.';
}
