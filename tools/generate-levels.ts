import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { findTheme, generateLevel } from '@cozy-room-sort/generator';
import { isDifficulty } from '@cozy-room-sort/schemas';
import { RECIPES } from './catalog-recipes.ts';

function main(): void {
    const { values } = parseArgs({ options: {
        catalog: { type: 'boolean' },
        theme: { type: 'string' },
        difficulty: { type: 'string' },
        count: { type: 'string' },
        seed: { type: 'string' },
        out: { type: 'string' }
    } });
    let out: string;
    let levels;
    if (values.catalog) {
        if (Object.keys(values).length !== 1) throw new Error('--catalog s’utilise seul');
        out = 'content/levels';
        levels = RECIPES.map(({ name, ...recipe }) => ({ ...generateLevel(recipe), name }));
    } else {
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
        out = values.out ?? 'generated-levels';
        levels = Array.from({ length: count }, (_, i) => generateLevel({ theme, difficulty, seed: seed + i, index: i + 1 }));
    }
    mkdirSync(out, { recursive: true });
    for (const level of levels) {
        const file = join(out, `${level.id}.json`);
        writeFileSync(file, `${JSON.stringify(level, null, 2)}\n`, { flag: values.catalog ? 'w' : 'wx' });
        console.log(`${file} : ${level.objects.length} objets, graine ${level.seed}`);
    }
}

try { main(); }
catch (error) {
    console.log(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
}
