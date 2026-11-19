// Inventaire des fichiers d'assets livrés, avec empreinte, taille, type, origine et licence. Matière préparatoire du
// futur verrou des assets : le format définitif viendra du registre commun des jeux, celui-ci n'en est pas un.
// Usage : node tools/inventaire-assets.ts [--check]   (--check : échoue si content/assets/inventaire.json est périmé)
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
export const INVENTAIRE = 'content/assets/inventaire.json';
const PROVENANCE = 'content/assets/provenance.json';

/** Dossiers d'assets livrés : atlas et leurs index, fichiers dérivés des planches, icônes et sons publics. */
export const DOSSIERS = ['content/assets/planches/atlas', 'content/assets/planches/derives', 'apps/web/public'] as const;

interface Origine { planche: string; sha256: string; boite?: number[]; transformations?: string[] }
interface Provenance {
    id: string; atlas?: string; fichiers?: string[]; derive_de?: string; licence: string;
    origine: Origine | string; derives?: { fichier: string; transformations: string[] }[];
}
export interface Entree {
    chemin: string; sha256: string; octets: number;
    type: 'atlas' | 'index d’atlas' | 'dérivé' | 'icône' | 'son';
    origine: string | { planches: { planche: string; sha256: string }[] } | { derive_de: string; planche: string; sha256: string };
    licence: string;
    cadres?: { provenance: string; ids: string[] };
}

function walk(folder: string): string[] {
    const absolute = join(root, folder);
    if (!existsSync(absolute)) return [];
    return readdirSync(absolute, { withFileTypes: true }).flatMap(entry => {
        const path = join(folder, entry.name);
        return entry.isDirectory() ? walk(path) : [path];
    });
}

/** Fichiers livrés, chemins relatifs à la racine du dépôt, triés. */
export function fichiersLivres(): string[] {
    return DOSSIERS.flatMap(walk).map(path => relative('.', path).split('\\').join('/')).sort();
}

const sha256 = (path: string): string => createHash('sha256').update(readFileSync(join(root, path))).digest('hex');

export function inventaire(): Entree[] {
    const provenance = JSON.parse(readFileSync(join(root, PROVENANCE), 'utf8')) as Provenance[];
    const planches = (atlas: string): { planche: string; sha256: string }[] => {
        const seen = new Map<string, string>();
        for (const entry of provenance) if (entry.atlas === atlas && typeof entry.origine !== 'string') seen.set(entry.origine.planche, entry.origine.sha256);
        return [...seen].sort().map(([planche, sha]) => ({ planche, sha256: sha }));
    };
    const licences = (atlas: string): string => [...new Set(provenance.filter(entry => entry.atlas === atlas).map(entry => entry.licence))].sort().join(', ');
    return fichiersLivres().map(chemin => {
        const base = { chemin, sha256: sha256(chemin), octets: readFileSync(join(root, chemin)).byteLength };
        const name = chemin.slice(chemin.lastIndexOf('/') + 1);
        if (chemin.startsWith('content/assets/planches/atlas/')) {
            const atlas = name.slice(0, name.lastIndexOf('.'));
            const index = JSON.parse(readFileSync(join(root, `content/assets/planches/atlas/${atlas}.json`), 'utf8')) as { frames: Record<string, unknown> };
            const ids = Object.keys(index.frames).map(key => key.replace(/^sprite-/, '')).sort();
            const known = new Set(provenance.filter(entry => entry.atlas === atlas).map(entry => entry.id));
            const missing = ids.filter(id => !known.has(id));
            if (missing.length) throw new Error(`Cadres sans provenance dans ${atlas} : ${missing.join(', ')}`);
            return { ...base, type: name.endsWith('.json') ? 'index d’atlas' : 'atlas', origine: { planches: planches(atlas) },
                licence: licences(atlas), cadres: { provenance: PROVENANCE, ids } } satisfies Entree;
        }
        const owner = provenance.find(entry => entry.fichiers?.includes(chemin));
        if (owner) {
            const origine = owner.origine;
            if (typeof origine === 'string') return { ...base, type: 'son', origine, licence: owner.licence } satisfies Entree;
            return { ...base, type: 'dérivé', origine: { derive_de: owner.derive_de ?? owner.id, planche: origine.planche, sha256: origine.sha256 },
                licence: owner.licence } satisfies Entree;
        }
        const source = provenance.find(entry => entry.derives?.some(item => item.fichier === chemin));
        if (source && typeof source.origine !== 'string') {
            return { ...base, type: 'icône', origine: { derive_de: `${source.atlas}/sprite-${source.id}`, planche: source.origine.planche, sha256: source.origine.sha256 },
                licence: source.licence } satisfies Entree;
        }
        throw new Error(`Fichier livré sans provenance : ${chemin}`);
    });
}

export const serialise = (entries: Entree[]): string => `${JSON.stringify(entries, null, 2)}\n`;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    const entries = inventaire();
    const text = serialise(entries);
    const target = join(root, INVENTAIRE);
    if (process.argv.includes('--check')) {
        const current = existsSync(target) ? readFileSync(target, 'utf8') : '';
        if (current !== text) { console.error(`${INVENTAIRE} est périmé : relancer npm run assets:inventaire`); process.exit(1); }
        console.log(`${INVENTAIRE} à jour`);
    } else {
        writeFileSync(target, text);
        console.log(`${INVENTAIRE} : ${entries.length} fichiers`);
    }
}
