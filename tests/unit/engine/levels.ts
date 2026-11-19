// Fabrique de niveaux de test : on décrit cartons et objets en une ligne, le reste prend une valeur par défaut.
import type { Level, Rules } from '@cozy-room-sort/schemas';

export interface MiniSpec {
    boxes: readonly (readonly [category: string, capacity: number])[];
    objects: readonly (readonly [id: string, category: string, blockedBy?: readonly string[], hidden?: boolean])[];
    rules?: Partial<Rules>;
    /** Seuils d'étoiles en passages par le tampon. */
    stars?: readonly [three: number, two: number];
}

export function makeLevel(spec: MiniSpec): Level {
    const categories = [...new Set([...spec.boxes.map(([c]) => c), ...spec.objects.map(([, c]) => c)])];
    return {
        schemaVersion: '1.2', rulesVersion: '2', id: 'test', name: 'Niveau de test', theme: 'salon', difficulty: 'easy', seed: 1,
        rules: { bufferCapacity: 3, activeBoxCount: 1, allowUndo: true, allowHints: true, timeLimitSeconds: null, ...spec.rules },
        categories: categories.map(id => ({ id, label: id })),
        boxes: spec.boxes.map(([category, capacity], i) => ({ id: `box-${i + 1}`, category, capacity })),
        objects: spec.objects.map(([id, category, blockedBy = [], hidden], i) => ({
            id, category, asset: `test-${id}`, position: { x: 0.5, y: 0.5 }, layer: i, blockedBy, ...(hidden === undefined ? {} : { hidden })
        })),
        scoring: { threeStarsMaxBuffered: spec.stars?.[0] ?? 100, twoStarsMaxBuffered: spec.stars?.[1] ?? 200 }
    };
}
