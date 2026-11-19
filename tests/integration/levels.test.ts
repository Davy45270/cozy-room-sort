import { activeThemes } from '../../content/themes/index.ts';
import { RECIPES } from '../../tools/catalog-recipes.ts';
import { generateLevel } from '@cozy-room-sort/generator';
// Les niveaux livrés : vingt, variés, tous valides et tous résolus par le solveur avec une solution enregistrée.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createInitialState, snapshotOf, step, withMode } from '@cozy-room-sort/engine';
import { validateLevel, type Level } from '@cozy-room-sort/schemas';
import { replayTrace, solve } from '@cozy-room-sort/solver';

const files = readdirSync('content/levels').filter(f => f.endsWith('.json')).sort();
const levels = files.map(f => JSON.parse(readFileSync(`content/levels/${f}`, 'utf8')) as Level);

describe('niveaux livrés', () => {
    it('vingt niveaux répartis sur les trois pièces', () => {
        expect(levels).toHaveLength(20);
        const byRoom = (room: string): number => levels.filter(l => l.theme === room).length;
        expect(activeThemes.map(room => byRoom(room.id))).toEqual([7, 7, 6]);
    });

    it('variés : pas seulement « trois piles de trois »', () => {
        const sizes = new Set(levels.map(l => l.objects.length));
        const categories = new Set(levels.map(l => l.categories.length));
        const buffers = new Set(levels.map(l => l.rules.bufferCapacity));
        const passes = new Set(levels.map(l => l.scoring.threeStarsMaxBuffered));
        expect(sizes.size).toBeGreaterThanOrEqual(6);
        expect(categories.size).toBeGreaterThanOrEqual(3);
        expect([...buffers].sort()).toEqual([3, 4, 5]);
        expect(levels.filter(level => level.difficulty === 'medium').length).toBeGreaterThanOrEqual(6);
        expect(passes.size).toBeGreaterThanOrEqual(4);
        expect(levels.some(l => l.rules.activeBoxCount === 2)).toBe(true);
        expect(levels.some(l => l.objects.some(o => o.hidden === true))).toBe(true);
        expect(Math.max(...levels.map(l => l.objects.length))).toBeGreaterThanOrEqual(18);
    });

    it('chaque catégorie d\'un niveau existe dans le thème de sa pièce', () => {
        for (const level of levels) {
            const theme = JSON.parse(readFileSync(`content/themes/${level.theme}.json`, 'utf8')) as { categories: { id: string }[] };
            const known = new Set(theme.categories.map(c => c.id));
            for (const c of level.categories) expect(known.has(c.id), `${level.id} : ${c.id}`).toBe(true);
        }
    });

    it.each(files.map((f, i) => [f, levels[i] as Level] as const))('%s : valide, solution rejouée jusqu\'à la victoire', (_f, level) => {
        expect(validateLevel(level).ok).toBe(true);
        const playable = withMode(level, 'classique');
        const solution = level.meta?.solution ?? [];
        let end = snapshotOf(createInitialState(playable));
        for (const move of solution) {
            const result = step(playable, end, move);
            if ('rejected' in result) throw new Error(`coup refusé : ${move}`);
            end = result.snapshot;
        }
        expect(end.status).toBe('won');
        expect(end.bufferedCount).toBe(level.scoring.threeStarsMaxBuffered);
    });
});

it('les deux stratégies trouvent la même longueur et la même dépense optimale sur le catalogue', () => {
    for (const level of levels) {
        const bfs = solve(level, { strategy: 'bfs' });
        const astar = solve(level, { strategy: 'astar' });
        if (bfs.kind !== 'solved' || astar.kind !== 'solved') throw new Error(`${level.id} : ${bfs.kind}, ${astar.kind}`);
        expect(astar.trace).toHaveLength(bfs.trace.length);
        expect(astar.buffered).toBe(bfs.buffered);
        expect(replayTrace(level, astar.trace)).toBe('won');
    }
});

it('le catalogue est identique aux recettes du générateur', () => {
    expect(RECIPES).toHaveLength(levels.length);
    for (const { name, ...recipe } of RECIPES) {
        const generated = { ...generateLevel(recipe), name };
        expect(levels.find(level => level.id === generated.id)).toEqual(generated);
    }
});

it.each(activeThemes.map(theme => theme.id))('T16 : %s génère et livre un niveau expert valide, résolu par A*', theme => {
    const dir = mkdtempSync(join(tmpdir(), 'cozy-expert-'));
    let level: Level;
    try {
        const command = spawnSync(process.execPath, ['tools/generate-levels.ts', '--theme', theme,
            '--difficulty', 'expert', '--seed', '42001', '--count', '1', '--out', dir], { encoding: 'utf8' });
        if (command.error) throw command.error;
        expect(command.status, command.stdout + command.stderr).toBe(0);
        level = JSON.parse(readFileSync(join(dir, `001-${theme}.json`), 'utf8')) as Level;
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
    expect(level.difficulty).toBe('expert');
    expect(level.seed).toBe(42001);
    expect(validateLevel(level).ok).toBe(true);
    const result = solve(level, { strategy: 'astar', maxStates: 20_000 });
    expect(result.kind).toBe('solved');
    if (result.kind !== 'solved') return;
    expect(replayTrace(level, result.trace)).toBe('won');
    expect(levels.some(item => item.theme === theme && item.difficulty === 'expert')).toBe(true);
});
