// Projection des coordonnées du niveau dans la vue carrée de la pièce, en pixels CSS.
import type { Level } from './level.ts';

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
export const REFERENCE_ROOM: Viewport = { width: 360, height: 360 };

export function roomView(viewport: Viewport): Placed {
    const side = Math.min(viewport.width, viewport.height);
    const margin = viewport.compact ? COMPACT_MARGIN : VIEW_MARGIN;
    const size = side * (1 - 2 * margin);
    return { x: viewport.width / 2, y: viewport.compact ? side * margin + size / 2 : viewport.height / 2, size };
}

/** Les objets occupent les murs et le fond de la pièce ; le devant du sol reste au chat. */
const OBJECT_WIDTH = 0.8;
const OBJECT_HEIGHT = 0.48;

export function objectSize(count: number, view: Placed): number {
    return Math.round(Math.max(MIN_SIZE, view.size * (0.18 - Math.min(count, 20) * 0.0025)));
}

/** Position normalisée d’un objet dont la boîte utile doit être centrée en (x, y), en pixels de la vue. */
export function positionForUsefulCenter(x: number, y: number, size: number, bounds: Bounds, view: Placed): { x: number; y: number } {
    return {
        x: 0.5 + (x - view.x - (bounds.x + bounds.w / 2 - 0.5) * size) / (view.size * OBJECT_WIDTH),
        y: 0.5 + (y - view.y - (bounds.y + bounds.h / 2 - 0.5) * size) / (view.size * OBJECT_HEIGHT)
    };
}

export function layoutRoom(level: Level, viewport: Viewport): Map<string, Placed> {
    const view = roomView(viewport);
    const size = objectSize(level.objects.length, view);
    return new Map(level.objects.map(object => [object.id, {
        x: view.x + (object.position.x - 0.5) * OBJECT_WIDTH * view.size,
        y: view.y + (object.position.y - 0.5) * OBJECT_HEIGHT * view.size,
        size
    }]));
}

const area = (b: Bounds): number => b.w * b.h;
export const usefulBox = (at: Placed, b: Bounds): Bounds => ({
    x: at.x - at.size / 2 + b.x * at.size, y: at.y - at.size / 2 + b.y * at.size, w: b.w * at.size, h: b.h * at.size
});

/** Part de la plus petite des deux boîtes couverte par l'autre. */
export function overlapRatio(a: Bounds, b: Bounds): number {
    const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return w <= 0 || h <= 0 ? 0 : w * h / Math.min(area(a), area(b));
}

/** Contrôle visuel complémentaire à la validation structurelle du niveau. */
export function roomGeometryError(level: Level, boundsOf: (asset: string) => Bounds | undefined): string | undefined {
    const placed = layoutRoom(level, REFERENCE_ROOM);
    const boxes = new Map<string, Bounds>();
    const layers = new Map(level.objects.map(({ id, layer }) => [id, layer]));
    for (const object of level.objects) {
        const bounds = boundsOf(object.asset);
        if (!bounds) return `boîte utile absente pour ${object.id} (${object.asset})`;
        boxes.set(object.id, usefulBox(placed.get(object.id)!, bounds));
        for (const blocker of object.blockedBy) {
            if (layers.get(blocker)! <= object.layer) return `${blocker} doit être devant ${object.id}`;
        }
    }
    for (const [i, a] of level.objects.entries()) for (const b of level.objects.slice(i + 1)) {
        const linked = a.blockedBy.includes(b.id) || b.blockedBy.includes(a.id);
        const ratio = overlapRatio(boxes.get(a.id)!, boxes.get(b.id)!);
        if (linked ? ratio < .25 : ratio >= .10) {
            const limit = linked ? '25 % minimum pour des objets liés' : 'moins de 10 % pour des objets sans lien';
            return `recouvrement de ${a.id} et ${b.id} : ${(ratio * 100).toFixed(2)} % (${limit})`;
        }
    }
    return undefined;
}
