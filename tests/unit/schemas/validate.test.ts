import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseLevel, validateLevel, type Level, type LevelError } from '../../../packages/schemas/src/index.ts';

const fixture = (name: string): string => readFileSync(new URL(`../../fixtures/levels/${name}.json`, import.meta.url), 'utf8');
const mini = (): Level => JSON.parse(fixture('valid-mini')) as Level;
const errorsOf = (input: unknown): readonly LevelError[] => {
    const result = validateLevel(input);
    if (result.ok) throw new Error('niveau accepté à tort');
    return result.errors;
};
const has = (errors: readonly LevelError[], path: string, text: string): boolean =>
    errors.some(e => e.path === path && e.message.includes(text));

describe('validateLevel', () => {
    it('accepte le niveau minimal valide', () => {
        const result = parseLevel(fixture('valid-mini'));
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.level.objects).toHaveLength(9);
    });

    it('refuse les identifiants qui désignent une propriété de tout objet JavaScript', () => {
        // Le moteur range objets, cartons et catégories par identifiant : « __proto__ » n'y crée aucune entrée.
        for (const reserved of ['__proto__', 'constructor', 'prototype']) {
            const level = mini();
            const old = level.objects[0]!.id;
            const objects = level.objects.map(o => ({ ...o, id: o.id === old ? reserved : o.id,
                blockedBy: o.blockedBy.map(id => id === old ? reserved : id) }));
            const renamed = { ...level, objects };
            expect(validateLevel(renamed).ok, reserved).toBe(false);
            expect(has(errorsOf(renamed), 'objects[0].id', 'réservé'), reserved).toBe(true);
            expect(has(errorsOf({ ...level, boxes: level.boxes.map((b, i) => i === 0 ? { ...b, id: reserved } : b) }), 'boxes[0].id', 'réservé')).toBe(true);
            expect(has(errorsOf({ ...level, categories: level.categories.map((c, i) => i === 0 ? { ...c, id: reserved } : c) }), 'categories[0].id', 'réservé')).toBe(true);
        }
    });

    it('rejette un cycle de blocage en citant les objets', () => {
        const errors = errorsOf(JSON.parse(fixture('cycle')));
        const cycle = errors.find(e => e.message.includes('cycle'));
        expect(cycle?.message).toContain('o1');
        expect(cycle?.message).toContain('o2');
    });

    it('rejette un quota qui ne tombe pas juste', () => {
        const errors = errorsOf(JSON.parse(fixture('bad-quota')));
        expect(errors.some(e => e.path === 'categories[0]' && e.message.includes('4 objets') && e.message.includes('capacité 3'))).toBe(true);
    });

    it('T-012 : un JSON malformé donne une erreur explicite sans exception', () => {
        const result = parseLevel(fixture('malformed'));
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors[0]?.path).toBe('$');
            expect(result.errors[0]?.message.startsWith('JSON illisible')).toBe(true);
        }
        expect(() => parseLevel('{')).not.toThrow();
    });

    it.each([null, [], 42, 'texte', {}])('rejette %j sans exception', input => {
        expect(() => validateLevel(input)).not.toThrow();
        expect(validateLevel(input).ok).toBe(false);
    });

    it('rejette un identifiant en double', () => {
        const level = mini();
        const objects = level.objects.map(o => ({ ...o }));
        objects[2] = { ...objects[2]!, id: 'o1' };
        expect(has(errorsOf({ ...level, objects }), 'objects[2].id', 'déjà utilisé')).toBe(true);
    });

    it('rejette une catégorie inconnue', () => {
        const level = mini();
        const boxes = [{ ...level.boxes[0]!, category: 'inconnue' }];
        expect(has(errorsOf({ ...level, boxes }), 'boxes[0].category', 'inconnue')).toBe(true);
    });

    it('rejette un bloqueur absent', () => {
        const level = mini();
        const objects = level.objects.map(o => ({ ...o }));
        objects[1] = { ...objects[1]!, blockedBy: ['zz'] };
        expect(has(errorsOf({ ...level, objects }), 'objects[1].blockedBy[0]', 'zz')).toBe(true);
    });

    it.each([0, 9])('rejette un tampon de %i places', bufferCapacity => {
        const level = mini();
        expect(has(errorsOf({ ...level, rules: { ...level.rules, bufferCapacity } }), 'rules.bufferCapacity', 'entre 1 et 8')).toBe(true);
    });

    it('rejette plus de cartons actifs que de cartons', () => {
        const level = mini();
        expect(has(errorsOf({ ...level, rules: { ...level.rules, activeBoxCount: 4 } }), 'rules.activeBoxCount', 'entre 1 et 3')).toBe(true);
    });

    it('rejette une position hors de [0, 1]', () => {
        const level = mini();
        const objects = level.objects.map(o => ({ ...o }));
        objects[0] = { ...objects[0]!, position: { x: 1.2, y: 0.4 } };
        expect(has(errorsOf({ ...level, objects }), 'objects[0].position.x', 'entre 0 et 1')).toBe(true);
    });

    it('rejette des seuils d\'étoiles inversés', () => {
        const level = mini();
        expect(has(errorsOf({ ...level, scoring: { threeStarsMaxBuffered: 3, twoStarsMaxBuffered: 2 } }), 'scoring', 'trois étoiles')).toBe(true);
    });

    it('cumule les erreurs au lieu de s\'arrêter à la première', () => {
        const level = mini();
        const errors = errorsOf({ ...level, rules: { ...level.rules, bufferCapacity: 0, activeBoxCount: 5 } });
        expect(errors.length).toBeGreaterThanOrEqual(2);
    });
});

it.each([
    ['easy', 10, 3, 5, 0, 1],
    ['medium', 20, 4, 4, 2, 5],
    ['expert', 40, 6, 3, 10, 18]
] as const)('vérifie les bornes de difficulté %s sur des quotas cohérents', (difficulty, count, families, bufferCapacity, minHidden, maxHidden) => {
    const base = mini();
    const categories = Array.from({ length: families }, (_, i) => ({ id: `cat-${i}`, label: `Famille ${i + 1}` }));
    const boxes = categories.map(({ id }, i) => ({
        id: `carton-${i}`, category: id,
        capacity: Math.floor(count / families) + (i < count % families ? 1 : 0)
    }));
    const at = (hidden: number): Level => ({
        ...base, difficulty, categories, boxes,
        rules: { ...base.rules, bufferCapacity },
        objects: Array.from({ length: count }, (_, i) => ({
            ...base.objects[0]!, id: `objet-${i}`, category: categories[i % families]!.id,
            hidden: i > 0 && i <= hidden, blockedBy: i === 0 ? [] : [`objet-${i - 1}`]
        }))
    });
    expect(validateLevel(at(minHidden)).ok).toBe(true);
    expect(validateLevel(at(maxHidden)).ok).toBe(true);
    expect(has(errorsOf(at(maxHidden + 1)), 'objects', 'masqués')).toBe(true);
    if (minHidden > 0) expect(has(errorsOf(at(minHidden - 1)), 'objects', 'masqués')).toBe(true);
    const wrongBuffer = at(minHidden);
    wrongBuffer.rules.bufferCapacity++;
    expect(has(errorsOf(wrongBuffer), 'rules.bufferCapacity', 'places')).toBe(true);
});
