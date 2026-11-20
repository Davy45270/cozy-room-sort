import type { SCHEMA_VERSION } from './migrate.ts';

// Contrat d'un niveau : ce que le moteur, le solveur et les outils lisent.
export type Difficulty = 'easy' | 'medium' | 'expert';

export interface Rules {
    bufferCapacity: number;
    activeBoxCount: number;
    allowUndo: boolean;
    allowHints: boolean;
    timeLimitSeconds: number | null;
    /** Quota d'annulations sur la partie ; absent = à volonté (l'historique garde les 200 derniers coups). Posé par `withMode`. */
    undoLimit?: number;
    /** Nombre d'indices permis ; absent = illimité. Posé par `withMode`. */
    hintLimit?: number;
}

export interface Category { id: string; label: string }
export interface Box { id: string; category: string; capacity: number }

export interface LevelObject {
    id: string;
    category: string;
    asset: string;
    position: { x: number; y: number };
    /** Ordre de dessin seulement ; aucun sens pour les règles. */
    layer: number;
    /** Objets posés sur celui-ci ou devant lui : il est accessible quand tous ont quitté la pièce. */
    blockedBy: readonly string[];
    /** Masqué (silhouette) tant qu'il n'est pas accessible. */
    hidden?: boolean;
}

export interface LevelMeta {
    solution?: readonly string[];
    engineVersion?: string;
    statesExplored?: number;
    nonTrivialDecisions?: number;
    legalMoves?: number;
    blockingMoves?: number;
    blockingMoveShare?: number;
}

export interface Level {
    schemaVersion: typeof SCHEMA_VERSION;
    rulesVersion: '2';
    id: string;
    name: string;
    theme: string;
    difficulty: Difficulty;
    seed: number;
    rules: Rules;
    categories: readonly Category[];
    boxes: readonly Box[];
    objects: readonly LevelObject[];
    /** Étoiles comptées en passages par le tampon : chaque partie gagnée compte autant de coups que d'objets. */
    scoring: { threeStarsMaxBuffered: number; twoStarsMaxBuffered: number };
    meta?: LevelMeta;
}

export interface LevelError { path: string; message: string }

export type ValidationResult = { ok: true; level: Level; migratedFrom?: '1.0' | '1.1' } | { ok: false; errors: readonly LevelError[] };
