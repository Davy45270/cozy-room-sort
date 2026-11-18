// Projection d'un niveau dans la zone de la pièce : pure, testée, partagée par la scène et les tests de bout en bout.
import type { Level } from '@cozy-room-sort/schemas';

export interface Viewport { width: number; height: number }
export interface Placed { x: number; y: number; size: number }

/** Taille de toucher minimale, en px CSS. */
export const MIN_SIZE = 44;
const MAX_SIZE = 132;

export function objectSize(level: Level, viewport: Viewport): number {
    const ideal = Math.sqrt((viewport.width * viewport.height) / (level.objects.length * 2.4));
    const fit = Math.min(viewport.width, viewport.height) / 2;
    return Math.round(Math.max(MIN_SIZE, Math.min(MAX_SIZE, ideal, fit)));
}

export function layoutRoom(level: Level, viewport: Viewport): Map<string, Placed> {
    const size = objectSize(level, viewport);
    const half = size / 2;
    const span = (extent: number, t: number): number => half + t * Math.max(0, extent - size);
    return new Map(level.objects.map(o => [o.id, {
        x: Math.round(span(viewport.width, o.position.x) * 10) / 10,
        y: Math.round(span(viewport.height, o.position.y) * 10) / 10,
        size
    }]));
}

/** Ordre de dessin : un objet n'est dessiné qu'après tous ceux qu'il recouvre (puis par couche croissante). */
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
