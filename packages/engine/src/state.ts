// État d'une partie. Un `Snapshot` est l'état sans historique : c'est ce que le solveur explore.
import type { Level } from '@cozy-room-sort/schemas';
import { statusOf } from './rules.ts';

export type Status = 'playing' | 'blocked' | 'won' | 'lost';

export interface Snapshot {
    schemaVersion: '1.0';
    levelId: string;
    status: Status;
    /** Objets encore dans la pièce, dans l'ordre du niveau. */
    remainingObjectIds: readonly string[];
    /** Tampon, dans l'ordre d'arrivée. */
    bufferObjectIds: readonly string[];
    /** Cartons actifs, par emplacement. */
    activeBoxIds: readonly string[];
    pendingBoxIds: readonly string[];
    completedBoxIds: readonly string[];
    boxFillCounts: Readonly<Record<string, number>>;
    /** Objet rangé → carton qui le contient. */
    packedIn: Readonly<Record<string, string>>;
    moveCount: number;
    undoCount: number;
    hintCount: number;
    elapsedMs: number;
}

export interface GameState extends Snapshot { history: readonly Snapshot[] }

export function createInitialState(level: Level): GameState {
    const active = level.boxes.slice(0, level.rules.activeBoxCount).map(b => b.id);
    const base: Snapshot = {
        schemaVersion: '1.0',
        levelId: level.id,
        status: 'playing',
        remainingObjectIds: level.objects.map(o => o.id),
        bufferObjectIds: [],
        activeBoxIds: active,
        pendingBoxIds: level.boxes.slice(level.rules.activeBoxCount).map(b => b.id),
        completedBoxIds: [],
        boxFillCounts: Object.fromEntries(level.boxes.map(b => [b.id, 0])),
        packedIn: {},
        moveCount: 0,
        undoCount: 0,
        hintCount: 0,
        elapsedMs: 0
    };
    return { ...base, status: statusOf(level, base), history: [] };
}

export function snapshotOf(state: GameState): Snapshot {
    const { history: _history, ...snapshot } = state;
    return snapshot;
}
