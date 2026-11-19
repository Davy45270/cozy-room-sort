import { readdirSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const root = 'content/assets/planches';
const json = (filename: string): unknown => JSON.parse(readFileSync(filename, 'utf8'));

interface Entry {
    id: string; atlas: string; dimensions: { w: number; h: number };
    ancre: string; hitbox: { x: number; y: number; w: number; h: number };
    origine: { planche: string; sha256: string; boite: number[]; marge: number; transformations: string[] };
    licence: string;
}

it('chaque cadre possède une provenance et une boîte utile dans ses dimensions', () => {
    const all = json('content/assets/provenance.json') as (Entry | { fichiers: string[] })[];
    expect(Array.isArray(all)).toBe(true);
    const entries = all.filter((entry): entry is Entry => 'atlas' in entry);
    const indexed = new Map(entries.map(entry => [`${entry.atlas}/sprite-${entry.id}`, entry]));
    expect(indexed.size).toBe(entries.length);
    let count = 0;
    for (const filename of readdirSync(`${root}/atlas`).filter(file => file.endsWith('.json'))) {
        const atlas = filename.slice(0, -5);
        const { frames } = json(`${root}/atlas/${filename}`) as { frames: Record<string, { frame: { w: number; h: number } }> };
        const source = json(`${root}/source/${atlas}.decoupe.json`) as { planche: string; marge: number; elements: { id: string; ancre: string; boite: number[] }[] };
        for (const [key, { frame }] of Object.entries(frames)) {
            count++;
            const entry = indexed.get(`${atlas}/${key}`);
            const origin = source.elements.find(element => `sprite-${element.id}` === key);
            expect(origin, key).toBeDefined();
            expect(entry, key).toMatchObject({
                dimensions: { w: frame.w, h: frame.h }, ancre: origin?.ancre,
                origine: { planche: source.planche, marge: source.marge, boite: origin?.boite },
                licence: ['CC', 'BY', '4.0'].join('-')
            });
            if (!entry) throw new Error(key);
            expect(entry.origine.sha256).toMatch(/^[a-f0-9]{64}$/);
            expect(entry.origine.transformations.length).toBeGreaterThan(0);
            for (const axis of [['x', 'w'], ['y', 'h']] as const) {
                const [start, size] = axis;
                expect(entry.hitbox[start]).toBeGreaterThanOrEqual(0);
                expect(entry.hitbox[size]).toBeGreaterThan(0);
                expect(entry.hitbox[start] + entry.hitbox[size]).toBeLessThanOrEqual(entry.dimensions[size]);
            }
        }
    }
    expect(entries).toHaveLength(count);
});

it('documente le polygone effacé de la vue de la salle de bain', () => {
    const source = json(`${root}/source/p04-vues.decoupe.json`) as { elements: { effacer?: number[][] }[] };
    const polygon = source.elements[0]?.effacer;
    expect(polygon).toBeDefined();
    const entry = (json('content/assets/provenance.json') as Entry[]).find(item => item.id === 'vue-salle-de-bain');
    expect(entry?.origine.transformations).toContain(
        `polygone effacé : pastille voisine collée ${JSON.stringify(polygon)}`);
});
