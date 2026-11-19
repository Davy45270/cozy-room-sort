import { generateLevel } from '@cozy-room-sort/generator';
import { validateLevel } from '@cozy-room-sort/schemas';
import fc from 'fast-check';
import { expect, it } from 'vitest';
import { replayTrace, solve } from '@cozy-room-sort/solver';
import { arbLevel } from './arbitraries.ts';

it('invariant : toute trace du solveur se rejoue jusqu\'à la victoire', () => {
    let solved = 0;
    fc.assert(fc.property(arbLevel({ maxObjects: 12 }), level => {
        const result = solve(level, undefined, { maxStates: 50_000 });
        if (result.kind === 'solved') {
            solved++;
            expect(replayTrace(level, result.trace)).toBe('won');
        }
    }), { numRuns: 100, seed: 20261118 });
    // La propriété ne vaut que si le générateur produit assez de niveaux solubles.
    expect(solved).toBeGreaterThanOrEqual(30);
});

it('les deux stratégies donnent le même optimum sur 50 niveaux engendrés', () => {
    const themes = ['salon', 'chambre', 'salle-de-bain'] as const;
    for (let seed = 0; seed < 50; seed++) {
        const difficulty = seed % 2 === 0 ? 'medium' : 'easy';
        const level = generateLevel({ theme: themes[seed % themes.length]!, difficulty, seed, index: 1 });
        expect(validateLevel(level).ok).toBe(true);
        const bfs = solve(level, { strategy: 'bfs' });
        const astar = solve(level, { strategy: 'astar' });
        if (astar.kind !== 'solved' || bfs.kind !== 'solved') throw new Error(`${level.theme} · ${seed} : niveau non résolu`);
        expect(astar.trace).toHaveLength(bfs.trace.length);
        expect(astar.buffered).toBe(bfs.buffered);
        expect(replayTrace(level, astar.trace)).toBe('won');
        expect(replayTrace(level, bfs.trace)).toBe('won');
        const expected = difficulty === 'medium' ? astar : bfs;
        expect(solve(level, { strategy: 'auto' })).toEqual(expected);
    }
});
