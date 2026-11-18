// Empreinte d'un état pour la recherche : deux états qui ne diffèrent que par l'ordre de la pièce sont le même.
// L'ordre du tampon compte, lui : le vidage suit l'ordre d'arrivée.
import type { Snapshot } from '@cozy-room-sort/engine';

export function stateKey(s: Snapshot): string {
    const room = [...s.remainingObjectIds].sort().join(',');
    const active = s.activeBoxIds.map(id => `${id}:${s.boxFillCounts[id] ?? 0}`).join(',');
    return `${room}|${s.bufferObjectIds.join(',')}|${active}|${s.completedBoxIds.length}`;
}
