import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
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

// Identifiants obligatoires des trois types d'enregistrements : retirés d'un niveau livré valide, ils sont refusés
// par validate.ts, sur le chemin exact du champ, et par le schéma publié.
const schemaAccepts = new Ajv2020({ allErrors: true, strict: false })
    .compile(JSON.parse(readFileSync('packages/schemas/level.schema.json', 'utf8')) as object);
const shipped = (): Record<string, Record<string, unknown>[]> =>
    JSON.parse(readFileSync('content/levels/002-salon.json', 'utf8')) as Record<string, Record<string, unknown>[]>;
const withoutId = (list: 'categories' | 'boxes' | 'objects'): void => {
    const intact = shipped();
    expect(validateLevel(intact).ok).toBe(true);
    expect(schemaAccepts(intact)).toBe(true);
    const level = shipped();
    delete level[list]![0]!['id'];
    const result = validateLevel(level);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map(e => e.path)).toContain(`${list}[0].id`);
    expect(schemaAccepts(level)).toBe(false);
    expect(schemaAccepts.errors?.some(e => e.instancePath === `/${list}/0` && e.keyword === 'required' && e.params['missingProperty'] === 'id')).toBe(true);
};

it('rejette une catégorie sans identifiant', () => { withoutId('categories'); });

it('rejette un carton sans identifiant', () => { withoutId('boxes'); });

it('rejette un objet sans identifiant', () => { withoutId('objects'); });

it('l’état initial porte la version de son format et l’identifiant du niveau', () => {
    const level = makeLevel({ boxes: [['livres', 1]], objects: [['l1', 'livres']] });
    const state = createInitialState(level);
    expect(state.schemaVersion).toBe('1.0');
    expect(state.levelId).toBe(level.id);
    expect(state.levelId).toBe('test');
});
