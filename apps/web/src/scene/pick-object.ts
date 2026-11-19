import { usefulBox, type Bounds, type Placed } from '@cozy-room-sort/schemas/room-geometry';

const MAX_DISTANCE = 22;

export interface Target {
    id: string;
    asset: string;
    at: Placed;
    bounds: Bounds;
}

/** Les cibles accessibles sont fournies de la plus proche à la plus éloignée dans l'ordre de dessin. */
export function pickObject(x: number, y: number, frontToBack: readonly Target[],
    opaqueAt: (target: Target, u: number, v: number) => boolean): string | undefined {
    let nearest: string | undefined;
    let bestDistance = Infinity;
    for (const target of frontToBack) {
        const { at, bounds } = target;
        const box = usefulBox(at, bounds);
        if (x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h
            && opaqueAt(target, (x - at.x) / at.size + .5, (y - at.y) / at.size + .5)) {
            return target.id;
        }
        const dx = Math.max(0, box.x - x, x - box.x - box.w);
        const dy = Math.max(0, box.y - y, y - box.y - box.h);
        const distance = dx * dx + dy * dy;
        if (distance <= MAX_DISTANCE * MAX_DISTANCE && distance < bestDistance) {
            nearest = target.id;
            bestDistance = distance;
        }
    }
    return nearest;
}
