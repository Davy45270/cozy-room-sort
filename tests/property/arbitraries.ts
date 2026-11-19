// Générateur de niveaux toujours valides pour les tests de propriétés.
import type { Level, LevelObject } from '@cozy-room-sort/schemas';
import fc from 'fast-check';

export interface ArbOptions { maxObjects?: number }

export function arbLevel(options: ArbOptions = {}): fc.Arbitrary<Level> {
    const maxObjects = options.maxObjects ?? 24;
    const boxesArb = fc.array(fc.array(fc.integer({ min: 1, max: 4 }), { minLength: 1, maxLength: 2 }), { minLength: 1, maxLength: 4 })
        .filter(cats => cats.flat().reduce((a, b) => a + b, 0) <= maxObjects);
    return boxesArb.chain(capacities => {
        const boxes = capacities.flatMap((caps, c) => caps.map((capacity, j) => ({ id: `box-${c}-${j}`, category: `cat-${c}`, capacity })));
        const objectCategories = capacities.flatMap((caps, c) => Array.from({ length: caps.reduce((a, b) => a + b, 0) }, () => `cat-${c}`));
        const n = objectCategories.length;
        return fc.record({
            boxOrder: fc.shuffledSubarray(boxes, { minLength: boxes.length, maxLength: boxes.length }),
            objectOrder: fc.shuffledSubarray(objectCategories.map((category, i) => ({ category, i })), { minLength: n, maxLength: n }),
            blockers: fc.array(fc.array(fc.nat(), { maxLength: 2 }), { minLength: n, maxLength: n }),
            hidden: fc.array(fc.double({ min: 0, max: 1, noNaN: true }), { minLength: n, maxLength: n }),
            bufferCapacity: fc.integer({ min: 1, max: 4 }),
            activeRatio: fc.double({ min: 0, max: 1, noNaN: true }),
            seed: fc.nat()
        }).map(({ boxOrder, objectOrder, blockers, hidden, bufferCapacity, activeRatio, seed }): Level => {
            const objects: LevelObject[] = objectOrder.map(({ category }, k) => {
                // Un objet n'est bloqué que par des objets d'indice inférieur : le graphe reste acyclique.
                const blockedBy = k === 0 ? [] : [...new Set((blockers[k] ?? []).map(b => `o${b % k}`))];
                const isHidden = blockedBy.length > 0 && (hidden[k] ?? 1) < 0.3;
                return { id: `o${k}`, category, asset: `test-${k}`, position: { x: 0.5, y: 0.5 }, layer: k, blockedBy, ...(isHidden ? { hidden: true } : {}) };
            });
            return {
                schemaVersion: '1.1', rulesVersion: '1', id: `gen-${seed}`, name: 'Niveau généré', theme: 'salon', difficulty: 'easy', seed,
                rules: {
                    bufferCapacity, activeBoxCount: 1 + Math.floor(activeRatio * (boxOrder.length - 1)),
                    allowUndo: true, allowHints: true, timeLimitSeconds: null
                },
                categories: capacities.map((_, c) => ({ id: `cat-${c}`, label: `Catégorie ${c}` })),
                boxes: boxOrder,
                objects,
                scoring: { threeStarsMaxBuffered: n, twoStarsMaxBuffered: n + 5 }
            };
        });
    });
}
