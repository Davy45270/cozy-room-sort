import { expect, it } from 'vitest';
import { pickObject, type Target } from '../../../apps/web/src/scene/pick-object.ts';

function target(id: string, x: number): Target {
    return { id, asset: id, at: { x, y: 0, size: 10 }, bounds: { x: 0, y: 0, w: 1, h: 1 } };
}

const blocked = target('masqué', 0);
const accessible = target('accessible', 20);
const isAccessible = (id: string): boolean => id === accessible.id;

function pick(x: number, opaqueAt: (target: Target) => boolean): string | undefined {
    return pickObject(x, 0, [blocked, accessible], opaqueAt, isAccessible);
}

it('désigne le pixel opaque de l’objet bloqué devant son voisin accessible', () => {
    expect(pick(0, candidate => candidate === blocked)).toBe(blocked.id);
});

it('rattrape un objet accessible près d’une zone vide', () => {
    expect(pick(47, () => false)).toBe(accessible.id);
    expect(pick(48, () => false)).toBeUndefined();
});

it('rattrape l’objet accessible même si un objet bloqué est plus proche', () => {
    expect(pick(6, () => false)).toBe(accessible.id);
});
