// La pièce est un ensemble. L'ordre du tampon et celui des cartons affectent le prochain coup.
import type { Snapshot } from '@cozy-room-sort/engine';

export function stateKey(s: Snapshot): string {
    return JSON.stringify([
        [...s.remainingObjectIds].sort(),
        s.bufferObjectIds,
        s.activeBoxIds.map(id => [id, s.boxFillCounts[id] ?? 0]),
        s.pendingBoxIds
    ]);
}
