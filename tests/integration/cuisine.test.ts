// @vitest-environment happy-dom
import { readFileSync, readdirSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { findTheme } from '@cozy-room-sort/generator';
import { LEVELS } from '../../apps/web/src/content.ts';
import { homeScreen } from '../../apps/web/src/screens/home.ts';
import kitchen from '../../content/themes/cuisine.json';
import bathroom from '../../content/themes/salle-de-bain.json';
import { DEFAULT_SETTINGS } from '../../apps/web/src/storage/db.ts';
import type { AppContext } from '../../apps/web/src/app-context.ts';

it('un thème inactif est absent du sélecteur, du générateur et des niveaux livrés', async () => {
    const inactive = kitchen.actif ? bathroom : kitchen;
    const ctx: AppContext = {
        settings: DEFAULT_SETTINGS,
        store: { progress: () => Promise.resolve({}) } as AppContext['store'],
        go: vi.fn(),
        updateSettings: vi.fn()
    };
    const { element } = await homeScreen(ctx);
    expect(element.querySelector(`[aria-label="${inactive.label}"]`)).toBeNull();
    expect(LEVELS.some(level => level.theme === inactive.id)).toBe(false);
    expect(readdirSync('content/levels').some(file => file.endsWith(`-${inactive.id}.json`))).toBe(false);
    expect(() => findTheme(inactive.id)).toThrow('univers absent');
});

it('la cuisine attend exactement les trente cadres déclarés dans la table de découpe vide', () => {
    const table = JSON.parse(readFileSync('content/assets/planches/source/cuisine-objets.decoupe.json', 'utf8')) as { attendus: string[] };
    expect(kitchen.categories).toHaveLength(6);
    expect(kitchen.categories.map(category => category.objets.length)).toEqual([5, 5, 5, 5, 5, 5]);
    const ids = kitchen.categories.flatMap(category => category.objets);
    expect(new Set(ids).size).toBe(30);
    expect(table).toMatchObject({ marge: 6, taille: 128, attendus: ids });
    if (!kitchen.actif) expect(table).toMatchObject({ planche: null, elements: [] });
});
