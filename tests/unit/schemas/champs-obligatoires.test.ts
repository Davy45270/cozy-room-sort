import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { validateLevel } from '../../../packages/schemas/src/index.ts';
import { createInitialState } from '../../../packages/engine/src/index.ts';
import { makeLevel } from '../engine/levels.ts';

const mini = (): Record<string, unknown> =>
    JSON.parse(readFileSync(new URL('../../fixtures/levels/valid-mini.json', import.meta.url), 'utf8')) as Record<string, unknown>;

it('rejette un niveau sans nom', () => {
    const level = mini();
    delete level['name'];
    const result = validateLevel(level);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some(e => `${e.path} ${e.message}`.includes('name'))).toBe(true);
});

it('rejette une catégorie sans libellé', () => {
    const level = mini();
    const categories = level['categories'] as Record<string, unknown>[];
    delete categories[0]!['label'];
    const result = validateLevel(level);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some(e => `${e.path} ${e.message}`.includes('label'))).toBe(true);
});

it('l’état initial porte la version de son format et l’identifiant du niveau', () => {
    const level = makeLevel({ boxes: [['livres', 1]], objects: [['l1', 'livres']] });
    const state = createInitialState(level);
    expect(state.schemaVersion).toBe('1.0');
    expect(state.levelId).toBe(level.id);
    expect(state.levelId).toBe('test');
});
