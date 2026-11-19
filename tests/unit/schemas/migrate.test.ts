import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { migrateLevel, validateLevel } from '@cozy-room-sort/schemas';

it('migre le contrat historique et diagnostique son quota incomplet', () => {
    const example: unknown = JSON.parse(readFileSync('tests/fixtures/levels/spec-exemple.json', 'utf8'));
    const migrated = migrateLevel(example);
    expect(migrated).toMatchObject({
        schemaVersion: '1.2', rulesVersion: '2',
        scoring: { threeStarsMaxBuffered: 3, twoStarsMaxBuffered: 9 }
    });
    expect(example).toMatchObject({ schemaVersion: '1.0', scoring: { threeStarsMaxMoves: 12 } });
    expect(migrateLevel(migrated)).toBe(migrated);
    const result = validateLevel(example);
    expect(result.ok).toBe(false);
    if (!result.ok) {
        expect(result.errors.some(error => error.path === 'categories[0]' && error.message.includes('capacité'))).toBe(true);
    }
});

it('refuse des niveaux hors seuils même quand les quotas sont cohérents', () => {
    const level: unknown = JSON.parse(readFileSync('tests/fixtures/levels/hors-seuils.json', 'utf8'));
    const result = validateLevel(level);
    expect(result.ok).toBe(false);
    if (!result.ok) {
        expect(result.errors.map(error => error.path)).toEqual(expect.arrayContaining(['objects', 'categories', 'rules.bufferCapacity']));
    }
});
