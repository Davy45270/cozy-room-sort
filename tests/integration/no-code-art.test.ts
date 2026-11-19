import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

function sources(folder: string): string[] {
    return readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
        const file = join(folder, entry.name);
        if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : sources(file);
        return /\.(?:[cm]?[jt]sx?|html|css|svg)$/.test(file) ? [file] : [];
    });
}

/**
 * Liste blanche, un seul usage : le fondu du bas de la vue (salle de bain). C'est un dégradé structurel, de la couleur
 * de la page, qui fond la base plate de la planche ; il n'illustre rien. Il est dessiné une fois sur une texture de
 * canevas, posée dans la scène entre la vue et les objets (un calque DOM passerait devant les objets en vol).
 */
const FADE_FILE = join('apps', 'web', 'src', 'scene', 'view-fade.ts');
const ALLOWED: Record<string, Record<string, number>> = { [FADE_FILE]: { createLinearGradient: 1, fillRect: 1 } };

const DRAWING = /<svg\b|createElementNS\s*\(|\.add\s*\.\s*graphics\s*\(|\b(?:fillRect|strokeRect|arc|createLinearGradient|createRadialGradient|createConicGradient|fillGradientStyle)\s*\(/gi;

it('les illustrations du jeu proviennent des atlas ; seul le fondu de la vue est dessiné, une fois', () => {
    const found: Record<string, Record<string, number>> = {};
    for (const file of ['apps/web/src', 'packages'].flatMap(sources)) {
        for (const match of readFileSync(file, 'utf8').matchAll(DRAWING)) {
            const name = match[0].replace(/\s*\($/, '').replace(/^\.add\s*\.\s*/, '');
            const counts = found[file] ??= {};
            counts[name] = (counts[name] ?? 0) + 1;
        }
    }
    expect(found).toEqual(ALLOWED);
});

it('les dégradés CSS se limitent au remplissage de la barre de progression', () => {
    const css = ['apps/web/src'].flatMap(sources).filter(file => /\.(?:css|[jt]s)$/.test(file));
    const gradients = css.flatMap(file => [...readFileSync(file, 'utf8').matchAll(/[\w.-]*\s*\{[^}]*?(?:linear|radial|conic)-gradient\(/g)]
        .map(match => `${file} ${match[0].split('{')[0]!.trim()}`));
    expect(gradients).toEqual([join('apps', 'web', 'src', 'styles.css') + ' .progress-fill']);
});
