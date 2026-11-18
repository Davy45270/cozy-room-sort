// Modes de jeu (§4.6 de la conception) : valeurs de départ, à calibrer.
import type { Level, Rules } from '@cozy-room-sort/schemas';

export type Mode = 'detente' | 'classique' | 'expert';

export function withMode(level: Level, mode: Mode): Level {
    const { undoLimit: _u, hintLimit: _h, ...base } = level.rules;
    let rules: Rules;
    if (mode === 'detente') rules = { ...base, allowUndo: true, allowHints: true, undoLimit: 200, bufferCapacity: base.bufferCapacity + 1 };
    else if (mode === 'classique') rules = { ...base, allowUndo: true, allowHints: true, undoLimit: 3, hintLimit: 3 };
    else rules = { ...base, allowUndo: false, allowHints: false, undoLimit: 0, hintLimit: 0 };
    return { ...level, rules };
}
