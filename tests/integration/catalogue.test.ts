import { readdirSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const root = 'content/assets/planches/atlas';
const excluded = /^(?:bac-|carton-(?:ouvert|ferme)$|sol-)/;
const read = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const expected = new Map(readdirSync(root).filter(file => /-(?:objets|meubles)\.json$/.test(file)).flatMap(file => {
    const atlas = file.slice(0, -5);
    const { frames } = read(`${root}/${file}`) as { frames: Record<string, unknown> };
    return Object.keys(frames).map(frame => frame.replace(/^sprite-/, '')).filter(id => !excluded.test(id))
        .map(id => [id, atlas] as const);
}));

interface Entry { id: string; atlas: string; categorie: string; univers: string[]; label: string }

it('T19 : tous les cadres d’objets et de meubles sont catalogués une seule fois dans au moins dix catégories', () => {
    const entries = read('content/catalog/objets.json') as Entry[];
    expect(entries.length).toBeGreaterThanOrEqual(130);
    expect(new Set(entries.map(entry => entry.id)).size).toBe(entries.length);
    expect(new Map(entries.map(({ id, atlas }) => [id, atlas]))).toEqual(expected);
    expect(new Set(entries.map(entry => entry.categorie)).size).toBeGreaterThanOrEqual(10);
    for (const { label, categorie, univers } of entries) {
        expect(label.trim()).toBeTruthy();
        expect(categorie.trim()).toBeTruthy();
        expect(univers.length).toBeGreaterThan(0);
    }
});
