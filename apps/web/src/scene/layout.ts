// Projection des coordonnées du niveau dans la vue carrée de la pièce, en pixels CSS.
import type { Level } from '@cozy-room-sort/schemas';

/** `compact` : portrait étroit, la vue prend toute la largeur et se colle en haut de sa zone. */
export interface Viewport { width: number; height: number; compact?: boolean }
export interface Placed { x: number; y: number; size: number }
/** Partie utile d'un cadre, en fractions de son côté. */
export interface Bounds { x: number; y: number; w: number; h: number }

export const MIN_SIZE = 44;
/** L'hexagone de la vue touche les bords de son cadre : une marge le garde entier dans la zone. */
export const VIEW_MARGIN = 0.03;
/** En portrait étroit, la marge latérale reste sous 2 % de la largeur. */
export const COMPACT_MARGIN = 0.015;
/** Portrait étroit (même requête que la feuille de styles). */
export const COMPACT_QUERY = '(max-width: 600px) and (orientation: portrait)';
/** Côté du chat endormi, en fraction de la vue. */
export const CAT_SIZE = 0.17;

export function roomView(viewport: Viewport): Placed {
    const side = Math.min(viewport.width, viewport.height);
    const margin = viewport.compact ? COMPACT_MARGIN : VIEW_MARGIN;
    const size = side * (1 - 2 * margin);
    return { x: viewport.width / 2, y: viewport.compact ? side * margin + size / 2 : viewport.height / 2, size };
}

/** Les objets occupent les murs et le fond de la pièce ; le devant du sol reste au chat. */
const objectX = (x: number): number => (x - 0.5) * 0.8;
const objectY = (y: number): number => y * 0.48 - 0.24;

export function layoutRoom(level: Level, viewport: Viewport): Map<string, Placed> {
    const view = roomView(viewport);
    const size = Math.round(Math.max(MIN_SIZE, view.size * (0.18 - Math.min(level.objects.length, 20) * 0.0025)));
    return new Map(level.objects.map(object => [object.id, {
        x: view.x + objectX(object.position.x) * view.size,
        y: view.y + objectY(object.position.y) * view.size,
        size
    }]));
}

const area = (b: Bounds): number => b.w * b.h;
const scaled = (at: Placed, b: Bounds): Bounds => ({
    x: at.x - at.size / 2 + b.x * at.size, y: at.y - at.size / 2 + b.y * at.size, w: b.w * at.size, h: b.h * at.size
});

/** Part de la plus petite des deux boîtes couverte par l'autre. */
export function overlapRatio(a: Bounds, b: Bounds): number {
    const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return w <= 0 || h <= 0 ? 0 : w * h / Math.min(area(a), area(b));
}

/** Demi-largeur du sol de l'hexagone à la hauteur `y`, en fraction de la vue centrée. */
const floorHalfWidth = (y: number): number => y <= 0.25 ? 0.45 : Math.max(0, 0.45 * (0.5 - y) / 0.25);

/**
 * Place le chat sur le sol, à l'endroit le moins recouvert par les objets du niveau (le plus près de sa place
 * habituelle à égalité). `boundsOf` rend la partie utile du cadre d'un objet.
 */
export function catSpot(level: Level, viewport: Viewport, cat: Bounds, boundsOf: (asset: string) => Bounds): Placed {
    const view = roomView(viewport);
    const placed = layoutRoom(level, viewport);
    const objects = level.objects.map(object => scaled(placed.get(object.id) as Placed, boundsOf(object.asset)));
    const size = view.size * CAT_SIZE;
    let best: { score: number; distance: number; at: Placed } | undefined;
    for (let i = -10; i <= 10; i++) for (let j = 0; j <= 10; j++) {
        const dx = i * 0.03;
        const dy = 0.12 + j * 0.025;
        const box = { x: dx - CAT_SIZE / 2 + cat.x * CAT_SIZE, y: dy - CAT_SIZE / 2 + cat.y * CAT_SIZE, w: cat.w * CAT_SIZE, h: cat.h * CAT_SIZE };
        if (Math.max(Math.abs(box.x), Math.abs(box.x + box.w)) > floorHalfWidth(box.y + box.h)) continue;
        const at = { x: view.x + dx * view.size, y: view.y + dy * view.size, size };
        const mine = scaled(at, cat);
        const score = Math.max(0, ...objects.map(object => overlapRatio(mine, object)));
        const distance = Math.hypot(dx - 0.15, dy - 0.33);
        if (!best || score < best.score - 1e-9 || (Math.abs(score - best.score) <= 1e-9 && distance < best.distance)) best = { score, distance, at };
    }
    return (best as { at: Placed }).at;
}

/** Ordre de dessin : un objet n'est dessiné qu'après les objets qu'il recouvre, par couche croissante. */
export function drawOrder(level: Level): string[] {
    const covered = new Map<string, string[]>();
    for (const o of level.objects) for (const b of o.blockedBy) covered.set(b, [...(covered.get(b) ?? []), o.id]);
    const placed = new Set<string>();
    const order: string[] = [];
    const pending = [...level.objects].sort((a, b) => a.layer - b.layer).map(o => o.id);
    while (pending.length > 0) {
        const index = pending.findIndex(id => (covered.get(id) ?? []).every(c => placed.has(c)));
        const id = pending.splice(Math.max(index, 0), 1)[0] as string;
        placed.add(id);
        order.push(id);
    }
    return order;
}
