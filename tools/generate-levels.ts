import { existsSync, linkSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { findTheme, generateLevel } from '@cozy-room-sort/generator';
import { isDifficulty, type Level } from '@cozy-room-sort/schemas';
import { RECIPES } from './catalog-recipes.ts';

function writeLevels(out: string, levels: readonly Level[], replace: boolean): void {
    const entries = levels.map(level => ({ level, name: `${level.id}.json` }));
    if (!replace) {
        const existing = entries.find(({ name }) => existsSync(join(out, name)));
        if (existing) throw new Error(`fichier déjà présent : ${join(out, existing.name)}`);
    }
    mkdirSync(out, { recursive: true });
    const pending = mkdtempSync(join(out, '.generation-'));
    try {
        for (const { level, name } of entries) {
            writeFileSync(join(pending, name), `${JSON.stringify(level, null, 2)}\n`);
        }
        for (const { level, name } of entries) {
            const source = join(pending, name);
            const destination = join(out, name);
            // Le fichier est complet avant de devenir visible. Le lien réserve le nom sans l'écraser.
            if (replace) renameSync(source, destination);
            else linkSync(source, destination);
            console.log(`${destination} : ${level.objects.length} objets, graine ${level.seed}`);
        }
    } finally {
        rmSync(pending, { recursive: true, force: true });
    }
}

function main(): void {
    const { values } = parseArgs({ options: {
        catalog: { type: 'boolean' },
        theme: { type: 'string' },
        difficulty: { type: 'string' },
        count: { type: 'string' },
        seed: { type: 'string' },
        out: { type: 'string' }
    } });
    if (values.catalog) {
        if (values.difficulty !== undefined || values.count !== undefined || values.seed !== undefined) {
            throw new Error('--catalog fixe les difficultés, le nombre et les graines');
        }
        const theme = values.theme === undefined ? undefined : findTheme(values.theme);
        const recipes = theme ? RECIPES.filter(recipe => recipe.theme === theme.id) : RECIPES;
        const out = values.out ?? 'content/levels';
        const levels = recipes.map(({ name, ...recipe }) => ({ ...generateLevel(recipe), name }));
        writeLevels(out, levels, true);
        for (const recipe of recipes) {
            const replaced = findTheme(recipe.theme).remplace;
            if (!replaced) continue;
            const index = String(recipe.index).padStart(3, '0');
            rmSync(join(out, `${index}-${replaced}.json`), { force: true });
        }
        return;
    }
    if (!values.theme) throw new Error('--theme est requis');
    const theme = findTheme(values.theme).id;
    const difficulty = values.difficulty;
    if (!isDifficulty(difficulty)) throw new Error('--difficulty attend easy, medium ou expert');
    const count = Number(values.count);
    const seed = Number(values.seed ?? '42001');
    if (!values.count || !Number.isSafeInteger(count) || count < 1) throw new Error('--count attend un entier positif');
    if (values.seed === '' || !Number.isSafeInteger(seed) || !Number.isSafeInteger(seed + count - 1)) {
        throw new Error('--seed attend une graine entière sûre pour tout le lot');
    }
    const out = values.out ?? 'generated-levels';
    const levels = Array.from({ length: count }, (_, i) => generateLevel({ theme, difficulty, seed: seed + i, index: i + 1 }));
    writeLevels(out, levels, false);
}

try { main(); }
catch (error) {
    console.log(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
}
