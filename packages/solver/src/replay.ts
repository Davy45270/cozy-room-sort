import { createInitialState, snapshotOf, step, type Status } from '@cozy-room-sort/engine';
import type { Level } from '@cozy-room-sort/schemas';

/** Rejoue une trace de solveur depuis l'état initial ; rend le statut final (« won » si la trace est juste). */
export function replayTrace(level: Level, trace: readonly string[]): Status {
    let s = snapshotOf(createInitialState(level));
    for (const move of trace) {
        const result = step(level, s, move);
        if ('rejected' in result) return s.status === 'won' ? 'blocked' : s.status;
        s = result.snapshot;
    }
    return s.status;
}
