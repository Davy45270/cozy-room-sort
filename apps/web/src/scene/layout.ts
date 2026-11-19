import type { Level } from '@cozy-room-sort/schemas';
import { layoutRoom, overlapRatio, roomView, usefulBox, type Bounds, type Placed, type Viewport } from '@cozy-room-sort/schemas/room-geometry';
export { layoutRoom, MIN_SIZE, overlapRatio, roomView, type Bounds, type Placed, type Viewport } from '@cozy-room-sort/schemas/room-geometry';

/** Portrait étroit (même requête que la feuille de styles). */
export const COMPACT_QUERY = '(max-width: 600px) and (orientation: portrait)';
/** Côté du chat endormi, en fraction de la vue. */
export const CAT_SIZE = 0.17;

/** Demi-largeur du sol de l'hexagone à la hauteur `y`, en fraction de la vue centrée. */
const floorHalfWidth = (y: number): number => y <= 0.25 ? 0.45 : Math.max(0, 0.45 * (0.5 - y) / 0.25);

/**
 * Place le chat sur le sol, à l'endroit le moins recouvert par les objets du niveau (le plus près de sa place
 * habituelle à égalité). `boundsOf` rend la partie utile du cadre d'un objet.
 */
export function catSpot(level: Level, viewport: Viewport, cat: Bounds, boundsOf: (asset: string) => Bounds): Placed {
    const view = roomView(viewport);
    const placed = layoutRoom(level, viewport);
    const objects = level.objects.map(object => usefulBox(placed.get(object.id) as Placed, boundsOf(object.asset)));
    const size = view.size * CAT_SIZE;
    let best: { score: number; distance: number; at: Placed } | undefined;
    for (let i = -10; i <= 10; i++) for (let j = 0; j <= 10; j++) {
        const dx = i * 0.03;
        const dy = 0.12 + j * 0.025;
        const box = { x: dx - CAT_SIZE / 2 + cat.x * CAT_SIZE, y: dy - CAT_SIZE / 2 + cat.y * CAT_SIZE, w: cat.w * CAT_SIZE, h: cat.h * CAT_SIZE };
        if (Math.max(Math.abs(box.x), Math.abs(box.x + box.w)) > floorHalfWidth(box.y + box.h)) continue;
        const at = { x: view.x + dx * view.size, y: view.y + dy * view.size, size };
        const mine = usefulBox(at, cat);
        const score = Math.max(0, ...objects.map(object => overlapRatio(mine, object)));
        const distance = Math.hypot(dx - 0.15, dy - 0.33);
        if (!best || score < best.score - 1e-9 || (Math.abs(score - best.score) <= 1e-9 && distance < best.distance)) best = { score, distance, at };
    }
    return (best as { at: Placed }).at;
}

// La validation garantit que chaque bloqueur a une couche supérieure.
export function drawOrder(level: Level): string[] {
    return [...level.objects].sort((a, b) => a.layer - b.layer).map(({ id }) => id);
}
