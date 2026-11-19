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

it('les illustrations du jeu proviennent des atlas', () => {
    const drawing = /<svg\b|createElementNS\s*\(|\.add\s*\.\s*graphics\s*\(|\b(?:fillRect|arc)\s*\(/i;
    expect(['apps/web/src', 'packages'].flatMap(sources).filter(file => drawing.test(readFileSync(file, 'utf8')))).toEqual([]);
});
