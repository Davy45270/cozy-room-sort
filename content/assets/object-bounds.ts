import type { Bounds } from '@cozy-room-sort/schemas/room-geometry';
import provenance from './provenance.json' with { type: 'json' };

const useful = new Map<string, Bounds>(provenance.flatMap(({ id, atlas, dimensions, hitbox }) => atlas
    ? [[id, { x: hitbox.x / dimensions.w, y: hitbox.y / dimensions.h, w: hitbox.w / dimensions.w, h: hitbox.h / dimensions.h }]]
    : []));

export function boundsOf(asset: string): Bounds | undefined {
    return useful.get(asset);
}
