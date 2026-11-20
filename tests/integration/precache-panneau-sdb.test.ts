import { existsSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const atlas = 'content/assets/planches/atlas/p04-quotas';
const read = (file: string): string => readFileSync(file, 'utf8');

it('le panneau des quotas de la salle de bain a son propre atlas, avec ce seul cadre', () => {
    expect(existsSync(`${atlas}.webp`)).toBe(true);
    const { frames } = JSON.parse(read(`${atlas}.json`)) as { frames: Record<string, unknown> };
    expect(Object.keys(frames)).toEqual(['sprite-panneau-quotas-sdb']);
});

it('l’atlas du panneau entre au précache : ni exclu du build, ni chargé à la demande, plafond inchangé', () => {
    for (const file of ['apps/web/src/atlas.ts', 'apps/web/vite.config.ts']) expect(read(file), file).not.toMatch(/p04-quotas/);
    const vite = read('apps/web/vite.config.ts');
    expect(vite).toMatch(/globPatterns:\s*\['\*\*\/\*\.\{html,js,css,png,webp,json,ogg,mp3\}'\]/);
    expect(vite).not.toMatch(/globIgnores/);
    const script = read('scripts/check-precache.js');
    const library = new RegExp(/const library = \/(.+)\/;/.exec(script)![1]!);
    expect(library.test('p04-quotas.webp')).toBe(false);
    expect(library.test('p04-ui.webp')).toBe(true);
    // Le contrôle du build exige ce fichier au manifeste du service worker et garde le plafond.
    expect(script).toContain("'p04-quotas.webp'");
    expect(script).toMatch(/const budget = 1_400_000;/);
});

it('le cadre de l’atlas du panneau a sa provenance complète', () => {
    const entries = JSON.parse(read('content/assets/provenance.json')) as { id: string; atlas?: string; licence: string; origine: { planche: string; boite: number[] } }[];
    const entry = entries.find(item => item.atlas === 'p04-quotas' && item.id === 'panneau-quotas-sdb');
    expect(entry).toMatchObject({
        licence: ['CC', 'BY', '4.0'].join('-'),
        origine: { planche: 'Cozy_Room_Sort_Planche_04_Salle_de_bain.webp', boite: [246, 209, 22, 799] }
    });
});
