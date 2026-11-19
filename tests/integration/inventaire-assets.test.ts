import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { inventaire, serialise } from '../../tools/inventaire-assets.ts';

interface Entry { chemin: string; sha256: string; octets: number; type: string; licence: string; cadres?: { provenance: string; ids: string[] } }
const entries = (): Entry[] => JSON.parse(readFileSync('content/assets/inventaire.json', 'utf8')) as Entry[];

/** Liste indépendante de l'outil : tout fichier sous les dossiers d'assets livrés. */
function delivered(): string[] {
    const walk = (folder: string): string[] => !existsSync(folder) ? [] : readdirSync(folder, { withFileTypes: true })
        .flatMap(entry => entry.isDirectory() ? walk(join(folder, entry.name)) : [join(folder, entry.name)]);
    return ['content/assets/planches/atlas', 'content/assets/planches/derives', 'apps/web/public'].flatMap(walk).sort();
}

it('chaque fichier livré a son entrée, et aucune entrée n’est orpheline', () => {
    const files = delivered();
    expect(files.length).toBeGreaterThan(30);
    expect(files).toContain('content/assets/planches/derives/choix-salle-de-bain-normal.webp');
    expect(entries().map(entry => entry.chemin).sort()).toEqual(files);
});

it('chaque empreinte et chaque taille sont exactes', () => {
    for (const entry of entries()) {
        const bytes = readFileSync(entry.chemin);
        expect(entry.sha256, entry.chemin).toBe(createHash('sha256').update(bytes).digest('hex'));
        expect(entry.octets, entry.chemin).toBe(bytes.byteLength);
        expect(entry.licence, entry.chemin).toBe(['CC', 'BY', '4.0'].join('-'));
    }
});

it('un atlas renvoie à la provenance de chacun de ses cadres ; les autres fichiers ont leur type', () => {
    const provenance = new Set((JSON.parse(readFileSync('content/assets/provenance.json', 'utf8')) as { id: string; atlas?: string }[])
        .flatMap(entry => entry.atlas ? [`${entry.atlas}/${entry.id}`] : []));
    const types = new Map(entries().map(entry => [entry.chemin, entry.type]));
    for (const entry of entries()) {
        if (!entry.chemin.startsWith('content/assets/planches/atlas/')) continue;
        const atlas = entry.chemin.slice(entry.chemin.lastIndexOf('/') + 1, entry.chemin.lastIndexOf('.'));
        const index = JSON.parse(readFileSync(`content/assets/planches/atlas/${atlas}.json`, 'utf8')) as { frames: Record<string, unknown> };
        expect(entry.type).toBe(entry.chemin.endsWith('.json') ? 'index d’atlas' : 'atlas');
        expect(entry.cadres?.provenance).toBe('content/assets/provenance.json');
        expect(entry.cadres?.ids).toEqual(Object.keys(index.frames).map(key => key.replace(/^sprite-/, '')).sort());
        for (const id of entry.cadres?.ids ?? []) expect(provenance.has(`${atlas}/${id}`), `${atlas}/${id}`).toBe(true);
    }
    expect(types.get('content/assets/planches/derives/choix-salle-de-bain-normal.webp')).toBe('dérivé');
    expect(types.get('apps/web/public/icons/cozy-room-sort-192.png')).toBe('icône');
    expect(types.get('apps/web/public/sons/victoire.ogg')).toBe('son');
});

it('le fichier d’inventaire est celui que rend l’outil', () => {
    expect(readFileSync('content/assets/inventaire.json', 'utf8')).toBe(serialise(inventaire()));
});
