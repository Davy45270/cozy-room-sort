import { readFileSync } from 'node:fs';
import { generateLevel } from '@cozy-room-sort/generator';
import { validateLevel, type Level } from '@cozy-room-sort/schemas';
import { replayTrace } from '@cozy-room-sort/solver';
import { expect, it } from 'vitest';

const request = { theme: 'salon', difficulty: 'medium', seed: 7, index: 1 } as const;

it('T-008 : même graine, même niveau avec trace gagnante et mesures de difficulté', () => {
    const level = generateLevel(request);
    expect(JSON.stringify(level)).toBe(JSON.stringify(generateLevel(request)));
    expect(validateLevel(level).ok).toBe(true);
    expect(replayTrace(level, level.meta?.solution ?? [])).toBe('won');
    const hidden = level.objects.filter(object => object.hidden === true).length;
    expect(level.objects.length).toBeGreaterThanOrEqual(16);
    expect(level.objects.length).toBeLessThanOrEqual(30);
    expect(level.categories.length).toBeGreaterThanOrEqual(4);
    expect(level.categories.length).toBeLessThanOrEqual(6);
    expect(level.rules.bufferCapacity).toBe(4);
    expect(hidden / level.objects.length).toBeGreaterThanOrEqual(0.1);
    expect(hidden / level.objects.length).toBeLessThanOrEqual(0.25);
    expect(level.meta?.engineVersion).toBeTruthy();
    expect(level.meta?.statesExplored).toBeGreaterThan(0);
    expect(level.meta?.legalMoves).toBeGreaterThan(0);
});

it('rejette un candidat structurellement valide mais insoluble', () => {
    const candidate = JSON.parse(readFileSync('tests/fixtures/levels/impossible-publication.json', 'utf8')) as Level;
    expect(validateLevel(candidate).ok).toBe(true);
    expect(() => generateLevel(request, { attempts: 1, candidate: () => candidate })).toThrow('unsolvable');
});

it('rejette un candidat non vérifié quand le budget est épuisé', () => {
    expect(() => generateLevel(request, { attempts: 1, maxStates: 1 })).toThrow('unverified');
});

it('écarte un candidat soluble dont les positions contredisent les blocages', () => {
    expect(() => generateLevel(request, {
        attempts: 1,
        candidate: level => ({
            ...level, objects: level.objects.map(object => ({ ...object, position: { x: .5, y: .5 } }))
        })
    })).toThrow('recouvrement');
});
