import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseLevel, validateLevel, type Level, type LevelError } from '../src/index.ts';

const fixture = (name: string): string => readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8');
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
        if (result.ok) expect(result.level.objects).toHaveLength(3);
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
        const boxes = [{ ...level.boxes[0]!, category: 'toys' }];
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
        expect(has(errorsOf({ ...level, rules: { ...level.rules, activeBoxCount: 2 } }), 'rules.activeBoxCount', 'entre 1 et 1')).toBe(true);
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
