import { readdirSync, readFileSync } from 'node:fs';
import type { Level } from '@cozy-room-sort/schemas';
import { expect, it } from 'vitest';
import catalog from '../../content/catalog/objets.json';
import { activeThemes } from '../../content/themes/index.ts';

function documents<T>(folder: string): T[] {
    return readdirSync(folder).filter(file => file.endsWith('.json')).map(file => JSON.parse(readFileSync(`${folder}/${file}`, 'utf8')) as T);
}

const entries = new Map(catalog.map(entry => [entry.id, entry]));
const frames = new Set(documents<{ frames: Record<string, unknown> }>('content/assets/planches/atlas').flatMap(atlas => Object.keys(atlas.frames)));

it('chaque cadre de thème existe et chaque objet appartient à sa catégorie dans sa pièce', () => {
    for (const theme of activeThemes) {
        expect(theme.label).toBeTruthy();
        for (const asset of [theme.vue, theme.sol, theme.selecteur]) expect(frames.has(`sprite-${asset}`), asset).toBe(true);
        for (const category of theme.categories) {
            expect(category.label).toBeTruthy();
            expect(category.objets.length).toBeGreaterThan(0);
            expect(category.icone).toBe(category.objets[0]);
            for (const asset of category.objets) {
                expect(frames.has(`sprite-${asset}`), asset).toBe(true);
                expect(entries.get(asset)?.univers, asset).toContain(theme.id);
            }
        }
    }
    for (const level of documents<Level>('content/levels')) {
        const theme = activeThemes.find(item => item.id === level.theme);
        expect(theme, level.id).toBeDefined();
        for (const object of level.objects) {
            expect(frames.has(`sprite-${object.asset}`), object.asset).toBe(true);
            expect(theme?.categories.find(category => category.id === object.category)?.objets, `${level.id} / ${object.id}`).toContain(object.asset);
        }
    }
});
