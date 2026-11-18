// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ASSETS, boxSvg, CATEGORY_FAMILIES, objectSvg, PICTOS, silhouetteSvg } from '../src/index.ts';

const provenance = JSON.parse(readFileSync('content/assets/provenance.json', 'utf8')) as { id: string; origin: string; license: string }[];
const parse = (svg: string): Document => new DOMParser().parseFromString(svg, 'image/svg+xml');
const all = (): [string, string][] => [
    ...ASSETS.map(a => [a, objectSvg(a)] as [string, string]),
    ...ASSETS.map(a => [`${a} (liseré)`, objectSvg(a, 128, '#E9D8BC')] as [string, string]),
    ...Object.keys(PICTOS).map(p => [`carton-${p}`, boxSvg(p)] as [string, string])
];

describe('art dessiné par code', () => {
    it.each(all())('%s : SVG bien formé, sans texte, image ni lien externe', (_id, svg) => {
        const doc = parse(svg);
        expect(doc.querySelector('parsererror')).toBeNull();
        expect(doc.documentElement.getAttribute('viewBox')).toBe('0 0 128 128');
        expect(svg.replaceAll('xmlns="http://www.w3.org/2000/svg"', '')).not.toMatch(/<text|<image|href=|https?:/);
    });

    it('au moins 3 variantes pour chaque famille utilisée par une catégorie', () => {
        for (const families of Object.values(CATEGORY_FAMILIES)) {
            const variants = ASSETS.filter(a => families.some(f => a.startsWith(`${f}-`)));
            expect(variants.length).toBeGreaterThanOrEqual(3);
        }
    });

    it('deux objets différents ont deux dessins différents', () => {
        const svgs = ASSETS.map(a => objectSvg(a));
        expect(new Set(svgs).size).toBe(ASSETS.length);
    });

    it('la silhouette ne garde aucune couleur de l\'objet', () => {
        const colors = silhouetteSvg('livre-terracotta', '#776655').match(/#[0-9A-Fa-f]{6}/g) ?? [];
        expect(new Set(colors)).toEqual(new Set(['#776655']));
    });

    it('chaque dessin a son entrée de provenance, origine code, licence du dépôt', () => {
        const ids = new Set(provenance.map(p => p.id));
        for (const a of ASSETS) expect(ids.has(a), a).toBe(true);
        for (const p of Object.keys(PICTOS)) expect(ids.has(`carton-${p}`), p).toBe(true);
        expect(provenance.every(p => p.origin === 'code' && p.license === 'MIT')).toBe(true);
    });

    it('un objet inconnu lève une erreur explicite', () => {
        expect(() => objectSvg('fusee-rouge')).toThrow('objet inconnu');
    });
});
