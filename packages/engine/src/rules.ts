// Règles R-001 à R-007 : accessibilité, rangement direct, tampon, file de cartons, vidage, statut.
import type { Box, Level, LevelObject } from '@cozy-room-sort/schemas';
import type { GameEvent, RejectReason } from './events.ts';
import type { Snapshot, Status } from './state.ts';

interface Index { objects: ReadonlyMap<string, LevelObject>; boxes: ReadonlyMap<string, Box> }
const indexes = new WeakMap<Level, Index>();
function indexOf(level: Level): Index {
    let index = indexes.get(level);
    if (!index) {
        index = { objects: new Map(level.objects.map(o => [o.id, o])), boxes: new Map(level.boxes.map(b => [b.id, b])) };
        indexes.set(level, index);
    }
    return index;
}

/** R-001 : un objet est accessible s'il est dans la pièce et que tous ses bloqueurs l'ont quittée. */
export function isAccessible(level: Level, s: Snapshot, objectId: string): boolean {
    const object = indexOf(level).objects.get(objectId);
    if (!object || !s.remainingObjectIds.includes(objectId)) return false;
    return object.blockedBy.every(b => !s.remainingObjectIds.includes(b));
}

/** Premier carton actif, dans l'ordre des emplacements, de la bonne catégorie et non plein. */
function targetBox(level: Level, active: readonly string[], category: string, fill: Readonly<Record<string, number>>): string | undefined {
    const boxes = indexOf(level).boxes;
    return active.find(id => {
        const box = boxes.get(id);
        return box !== undefined && box.category === category && (fill[id] ?? 0) < box.capacity;
    });
}

/** Objets dont la sélection serait acceptée, dans l'ordre du niveau. */
export function legalMoves(level: Level, s: Snapshot): string[] {
    if (s.status === 'won' || s.status === 'lost') return [];
    const objects = indexOf(level).objects;
    const room = s.bufferObjectIds.length < level.rules.bufferCapacity;
    return s.remainingObjectIds.filter(id => {
        if (!isAccessible(level, s, id)) return false;
        const object = objects.get(id);
        return object !== undefined && (room || targetBox(level, s.activeBoxIds, object.category, s.boxFillCounts) !== undefined);
    });
}

/** Étoiles d'une partie gagnée, selon le nombre d'objets passés par le tampon. */
export function starsFor(level: Level, bufferedCount: number): 1 | 2 | 3 {
    if (bufferedCount <= level.scoring.threeStarsMaxBuffered) return 3;
    if (bufferedCount <= level.scoring.twoStarsMaxBuffered) return 2;
    return 1;
}

/** Statut d'un état (§4.4) : victoire, sinon blocage ou échec s'il ne reste aucun coup légal. */
export function statusOf(level: Level, s: Snapshot): Status {
    if (s.remainingObjectIds.length === 0 && s.bufferObjectIds.length === 0 && s.activeBoxIds.length === 0 && s.pendingBoxIds.length === 0) return 'won';
    if (legalMoves(level, { ...s, status: 'playing' }).length > 0) return 'playing';
    return level.rules.allowUndo ? 'blocked' : 'lost';
}

interface Working {
    buffer: string[];
    active: string[];
    pending: string[];
    completed: string[];
    fill: Record<string, number>;
    packedIn: Record<string, string>;
    buffered: number;
    events: GameEvent[];
}

/** Range un objet ; complète le carton s'il est plein et active le suivant au même emplacement (R-004). */
function pack(level: Level, w: Working, objectId: string, boxId: string, fromBuffer: boolean): void {
    w.fill[boxId] = (w.fill[boxId] ?? 0) + 1;
    w.packedIn[objectId] = boxId;
    w.events.push({ type: 'OBJECT_PACKED', objectId, boxId, fromBuffer });
    const box = indexOf(level).boxes.get(boxId);
    if (!box || (w.fill[boxId] ?? 0) < box.capacity) return;
    w.completed.push(boxId);
    w.events.push({ type: 'BOX_COMPLETED', boxId });
    const slot = w.active.indexOf(boxId);
    const next = w.pending.shift();
    if (next === undefined) w.active.splice(slot, 1);
    else {
        w.active[slot] = next;
        w.events.push({ type: 'BOX_ACTIVATED', boxId: next, slot });
    }
}

/** R-005 : vidage du tampon dans l'ordre d'arrivée, repris depuis le début après chaque rangement. */
function drain(level: Level, w: Working): void {
    const objects = indexOf(level).objects;
    for (let moved = true; moved;) {
        moved = false;
        for (const [i, id] of w.buffer.entries()) {
            const object = objects.get(id);
            const target = object && targetBox(level, w.active, object.category, w.fill);
            if (target === undefined) continue;
            w.buffer.splice(i, 1);
            pack(level, w, id, target, true);
            moved = true;
            break;
        }
    }
}

/** Un coup SELECT_OBJECT sans historique. Le solveur l'utilise directement. */
export function step(level: Level, s: Snapshot, objectId: string): { snapshot: Snapshot; events: GameEvent[] } | { rejected: RejectReason } {
    if (s.status === 'won' || s.status === 'lost') return { rejected: 'not-playing' };
    if (!isAccessible(level, s, objectId)) return { rejected: 'not-accessible' };
    const object = indexOf(level).objects.get(objectId);
    if (!object) return { rejected: 'not-accessible' };
    const w: Working = {
        buffer: [...s.bufferObjectIds], active: [...s.activeBoxIds], pending: [...s.pendingBoxIds],
        completed: [...s.completedBoxIds], fill: { ...s.boxFillCounts }, packedIn: { ...s.packedIn }, buffered: s.bufferedCount, events: []
    };
    const target = targetBox(level, s.activeBoxIds, object.category, w.fill);
    if (target !== undefined) pack(level, w, objectId, target, false);
    else if (w.buffer.length < level.rules.bufferCapacity) {
        w.buffer.push(objectId);
        w.buffered++;
        w.events.push({ type: 'OBJECT_BUFFERED', objectId });
    } else return { rejected: 'buffer-full' };
    drain(level, w);
    const next: Snapshot = {
        ...s,
        remainingObjectIds: s.remainingObjectIds.filter(id => id !== objectId),
        bufferObjectIds: w.buffer, activeBoxIds: w.active, pendingBoxIds: w.pending, completedBoxIds: w.completed,
        boxFillCounts: w.fill, packedIn: w.packedIn, moveCount: s.moveCount + 1, bufferedCount: w.buffered
    };
    const status = statusOf(level, next);
    if (status === 'won') w.events.push({ type: 'LEVEL_WON', moveCount: next.moveCount, bufferedCount: next.bufferedCount, stars: starsFor(level, next.bufferedCount) });
    return { snapshot: { ...next, status }, events: w.events };
}
