// Projection des coordonnées du niveau dans la vue carrée de la pièce, en pixels CSS.
import type { Level } from '@cozy-room-sort/schemas';

export interface Viewport { width: number; height: number }
export interface Placed { x: number; y: number; size: number }

export const MIN_SIZE = 44;

export function roomView(viewport: Viewport): Placed {
    return {
        x: viewport.width / 2,
        y: viewport.height / 2,
        size: Math.min(640, viewport.width * 0.96, viewport.height * 0.98)
    };
}

export function layoutRoom(level: Level, viewport: Viewport): Map<string, Placed> {
    const view = roomView(viewport);
    const size = Math.round(Math.max(MIN_SIZE, view.size * (0.18 - Math.min(level.objects.length, 20) * 0.0025)));
    return new Map(level.objects.map(object => [object.id, {
        x: view.x + (object.position.x - 0.5) * view.size * 0.8,
        y: view.y + (object.position.y * 0.57 - 0.15) * view.size,
        size
    }]));
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
