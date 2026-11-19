// @vitest-environment happy-dom
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import type { AppContext } from '../../../apps/web/src/app-context.ts';
import { THEMES } from '../../../apps/web/src/content.ts';
import { homeScreen } from '../../../apps/web/src/screens/home.ts';
import { levelsScreen } from '../../../apps/web/src/screens/levels.ts';

const DERIVE = 'derives/choix-salle-de-bain-normal.webp';

function context(): AppContext {
    return {
        store: { progress: () => Promise.resolve({}) } as unknown as AppContext['store'],
        settings: { lastLevelId: null } as unknown as AppContext['settings'],
        go: () => undefined,
        updateSettings: () => Promise.resolve()
    };
}

const frameOf = (button: Element | null): string | null | undefined =>
    button?.querySelector('.atlas-frame')?.getAttribute('data-frame');

it('seule la salle de bain déclare un état normal dérivé', () => {
    expect(THEMES['salle-de-bain']?.selecteur_normal).toBe(DERIVE);
    for (const theme of Object.values(THEMES).filter(item => item.id !== 'salle-de-bain')) expect(theme.selecteur_normal).toBeUndefined();
});

it('l’onglet non sélectionné de la salle de bain montre l’état normal, le sélectionné le cadre de la planche', async () => {
    const { element } = await levelsScreen(context(), 'salon');
    const tab = element.querySelector('[data-testid="onglet-salle-de-bain"]') as HTMLButtonElement;
    expect(tab.getAttribute('aria-selected')).toBe('false');
    expect(frameOf(tab)).toBe('derive-choix-salle-de-bain-normal');
    expect(tab.querySelector('img')?.getAttribute('src')).toContain('choix-salle-de-bain-normal');
    expect(frameOf(element.querySelector('[data-testid="onglet-salon"]'))).toBe('sprite-choix-salon');
    tab.click();
    expect(tab.getAttribute('aria-selected')).toBe('true');
    expect(frameOf(tab)).toBe('sprite-choix-salle-de-bain');
    expect(frameOf(element.querySelector('[data-testid="onglet-salon"]'))).toBe('sprite-choix-salon');
    const sdb = await levelsScreen(context(), 'salle-de-bain');
    expect(frameOf(sdb.element.querySelector('[data-testid="onglet-salle-de-bain"]'))).toBe('sprite-choix-salle-de-bain');
});

it('l’accueil, où aucune pièce n’est sélectionnée, montre l’état normal de la salle de bain', async () => {
    const { element } = await homeScreen(context());
    expect(frameOf(element.querySelector('.room-choice[aria-label="Salle de bain"]'))).toBe('derive-choix-salle-de-bain-normal');
    expect(frameOf(element.querySelector('.room-choice[aria-label="Salon"]'))).toBe('sprite-choix-salon');
});

it('la provenance décrit le fichier dérivé, son empreinte de planche et sa transformation', () => {
    const entries = JSON.parse(readFileSync('content/assets/provenance.json', 'utf8')) as Record<string, unknown>[];
    const entry = entries.find(item => item['id'] === 'choix-salle-de-bain-normal') as {
        fichiers: string[]; licence: string; origine: { planche: string; sha256: string; boite: number[]; transformations: string[] };
    } | undefined;
    const source = entries.find(item => item['id'] === 'choix-salle-de-bain') as { origine: { planche: string; sha256: string } };
    expect(entry).toBeDefined();
    expect(entry?.fichiers).toEqual([`content/assets/planches/${DERIVE}`]);
    expect(entry?.licence).toBe(['CC', 'BY', '4.0'].join('-'));
    expect(entry?.origine).toMatchObject({ planche: source.origine.planche, sha256: source.origine.sha256, boite: [169, 178, 1354, 8] });
    expect(entry?.origine.transformations.join(' ')).toMatch(/transformation de couleur.*aucun trait redessiné/);
    const bytes = readFileSync(`content/assets/planches/${DERIVE}`);
    expect(bytes.byteLength).toBe(13_656);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe('a50a0d43a54589c87655e64e1e6032515365c67c042875ea48428825c25227fd');
});

it('l’état normal est cadré comme le cadre de la planche : même partie utile, sans décalage', async () => {
    const { element } = await homeScreen(context());
    const frame = element.querySelector('.room-choice[aria-label="Salle de bain"] .atlas-frame') as HTMLElement;
    const img = frame.querySelector('img')!;
    // Oracles écrits ici : fichier dérivé 200 × 200, partie utile x 5, y 0, 190 × 200.
    expect(Number.parseFloat(img.style.width)).toBeCloseTo(200 / 190 * 100, 3);
    expect(Number.parseFloat(img.style.left)).toBeCloseTo(-5 / 190 * 100, 3);
    expect(Number.parseFloat(img.style.top)).toBeCloseTo(0, 3);
    expect(Number.parseFloat(frame.style.getPropertyValue('--frame-ratio'))).toBeCloseTo(190 / 200, 4);
});
