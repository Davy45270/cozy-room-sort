// Objets transparents, détourés et normalisés dans les atlas d'objets livrés.
// L'alpha se lit dans l'en-tête WebP ; le détourage et la normalisation, dans la provenance (aucun décodeur
// WebP n'est disponible dans les dépendances : les pixels ne sont pas décodés ici).
import { readdirSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const root = 'content/assets/planches/atlas';
const objectAtlases = readdirSync(root).filter(file => /-objets\.webp$/.test(file)).map(file => file.slice(0, -5));
const read = (file: string): string => readFileSync(file, 'utf8');

interface Rect { x: number; y: number; w: number; h: number }
interface Entry { id: string; atlas?: string; ancre: string; dimensions: { w: number; h: number }; hitbox: Rect; origine: { transformations: string[] } }

/** Vrai si le WebP porte un canal alpha : VP8X avec le drapeau alpha et un bloc ALPH, ou VP8L sans perte. */
function webpHasAlpha(bytes: Buffer): boolean {
    if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') return false;
    const first = bytes.toString('ascii', 12, 16);
    if (first === 'VP8L') return true;
    if (first !== 'VP8X' || (bytes[20]! & 0x10) === 0) return false;
    // Parcours des blocs : un VP8 avec perte n'a d'alpha que si un bloc ALPH le précède.
    for (let offset = 12; offset + 8 <= bytes.length;) {
        const chunk = bytes.toString('ascii', offset, offset + 4);
        if (chunk === 'ALPH' || chunk === 'VP8L') return true;
        if (chunk === 'VP8 ') return false;
        const size = bytes.readUInt32LE(offset + 4);
        offset += 8 + size + (size & 1);
    }
    return false;
}

const riff = (chunks: [string, number[]][]): Buffer => {
    const body = chunks.flatMap(([name, data]) => {
        const size = Buffer.alloc(4); size.writeUInt32LE(data.length);
        return [...Buffer.from(name), ...size, ...data, ...(data.length & 1 ? [0] : [])];
    });
    return Buffer.from([...Buffer.from('RIFF\0\0\0\0WEBP'), ...body]);
};

it('lit le canal alpha des en-têtes WebP', () => {
    const header = [0x10, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(webpHasAlpha(riff([['VP8X', header], ['ALPH', [0]], ['VP8 ', [0, 0]]]))).toBe(true);
    expect(webpHasAlpha(riff([['VP8L', [0x2f]]]))).toBe(true);
    expect(webpHasAlpha(riff([['VP8 ', [0, 0]]]))).toBe(false);
    expect(webpHasAlpha(riff([['VP8X', [0, ...header.slice(1)]], ['VP8 ', [0, 0]]]))).toBe(false);
    expect(webpHasAlpha(riff([['VP8X', header], ['VP8 ', [0, 0]]]))).toBe(false);
});

it('chaque atlas d’objets livré est un WebP à canal alpha', () => {
    expect(objectAtlases.length).toBeGreaterThanOrEqual(4);
    expect(objectAtlases.filter(atlas => !webpHasAlpha(readFileSync(`${root}/${atlas}.webp`)))).toEqual([]);
});

it('chaque objet est détouré dans un cadre carré transparent et normalisé : plus grand côté à la taille du cadre, centré, posé selon son ancre', () => {
    const entries = (JSON.parse(read('content/assets/provenance.json')) as Entry[]).filter(entry => entry.atlas?.endsWith('-objets'));
    let checked = 0;
    for (const atlas of objectAtlases) {
        const { frames } = JSON.parse(read(`${root}/${atlas}.json`)) as { frames: Record<string, { frame: Rect }> };
        const keys = Object.keys(frames);
        expect(keys.length, atlas).toBeGreaterThan(0);
        // Normalisation : un seul format de cadre carré par atlas d'objets.
        const sizes = new Set(keys.map(key => `${frames[key]!.frame.w}x${frames[key]!.frame.h}`));
        expect([...sizes], atlas).toHaveLength(1);
        for (const key of keys) {
            const { frame } = frames[key]!;
            const entry = entries.find(item => item.atlas === atlas && `sprite-${item.id}` === key);
            expect(entry, `${atlas} ${key}`).toBeDefined();
            if (!entry) continue;
            checked++;
            const { hitbox: box } = entry;
            const label = `${atlas} ${key} ${JSON.stringify(box)}`;
            expect(frame.w, label).toBe(frame.h);
            expect(entry.dimensions, label).toEqual({ w: frame.w, h: frame.h });
            expect(entry.origine.transformations, label).toContain('Mise à l’échelle dans un cadre carré transparent');
            // Boîte utile dans le cadre. Elle touche toujours un bord après la mise à l'échelle : la marge
            // transparente n'est pas garantie, seule la zone hors de l'objet l'est (non mesurée ici).
            expect(box.x, label).toBeGreaterThanOrEqual(0);
            expect(box.y, label).toBeGreaterThanOrEqual(0);
            expect(box.x + box.w, label).toBeLessThanOrEqual(frame.w);
            expect(box.y + box.h, label).toBeLessThanOrEqual(frame.h);
            // Mise à l'échelle : le plus grand côté de l'objet occupe tout le cadre.
            expect(Math.max(box.w, box.h), label).toBe(frame.w);
            // Centrage horizontal à un pixel près ; ancre basse posée au bas du cadre, sinon centrage vertical.
            expect(Math.abs(2 * box.x + box.w - frame.w), label).toBeLessThanOrEqual(1);
            if (entry.ancre === 'bas') expect(box.y + box.h, label).toBe(frame.h);
            else expect(Math.abs(2 * box.y + box.h - frame.h), label).toBeLessThanOrEqual(1);
        }
    }
    expect(checked).toBe(entries.length);
});
