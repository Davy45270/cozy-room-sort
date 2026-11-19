// Repris de six-de-chaque (tests/brand-guard.test.ts), liste adaptée aux objets des planches.
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { publicLines } from '../scripts/public-files';
import { it, expect } from 'vitest';
// Noms coupés en morceaux pour que la garde ne se dénonce pas elle-même.
const forbidden = [['mochi', 'room'], ['play', 'station'], ['x', 'box'], ['nin', 'tendo'], ['rub', 'ik'], ['le', 'go'], ['de', 'walt'],
    ['wd', '-40'], ['kuber', 'netes'], ['git', 'lab'], ['route', ' 66'], ['space', ' invaders'], ['ko', 'ng'], ['cozy sort', ' studio'],
    ['decor &', ' sort'], ['tet', 'ris'], ['pac', '-man'], ['soko', 'ban']].map(parts => parts.join(''));
const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const brand = new RegExp(`\\b(?:${forbidden.map(escape).join('|')})\\b`, 'i');
// Le jeu de référence se reconnaît aussi collé à un autre mot, dans un identifiant par exemple.
const workName = new RegExp(['mochi', 'room'].join(''), 'i');
const ticket = /\b[A-Z]{2,10}-\d+\b/;
const bad = (line: string): boolean => brand.test(line) || workName.test(line) || ticket.test(line);
it('public text has no commercial names or internal ticket identifiers', () => {
    const violations = publicLines(process.cwd()).filter(({ file, line }) =>
        !(file === 'content/assets/provenance.json' && /^\s*"licence": "CC-BY\x2d4\.0"$/.test(line)) && bad(line)).map(({ file, number }) => `${file}:${number}`);
    expect(violations).toEqual([]);
});
it('the guard matches separated commercial names and uppercase ticket shapes only', () => {
    for (const name of forbidden) { expect(brand.test(`(${name.toUpperCase()})`)).toBe(true); expect(brand.test(`prefix${name}suffix`)).toBe(false); }
    expect(workName.test(['my', 'Mochi', 'roomState'].join(''))).toBe(true);
    expect(ticket.test(['AB', '123'].join('-'))).toBe(true); expect(ticket.test('ordinary-123')).toBe(false);
    expect(ticket.test('T17 replay')).toBe(false);
});

it('ignored and untracked files are never read, including without git', () => {
    const root = mkdtempSync(join(tmpdir(), 'public-text-'));
    try {
        mkdirSync(join(root, 'packages'));
        writeFileSync(join(root, 'packages', 'visible.ts'), 'source');
        writeFileSync(join(root, 'untracked.txt'), 'untracked');
        const ignored = ['.home/.npm/_cacache', '.cache', 'node_modules', 'dist', 'test-results', 'packages/.hidden'];
        for (const folder of ignored) {
            mkdirSync(join(root, folder), { recursive: true });
            // Invalid UTF encoding would pollute the result if these files were read.
            writeFileSync(join(root, folder, 'private.txt'), Buffer.from([255]));
        }
        const tracked = () => ['packages/visible.ts', ...ignored.map(folder => `${folder}/private.txt`)];
        const reads: string[] = [];
        const read = (file: string): string => { reads.push(file); return readFileSync(file, 'utf8'); };
        expect(publicLines(root, tracked, read)).toEqual([{ file: 'packages/visible.ts', line: 'source', number: 1 }]);
        const fallback = publicLines(root, () => { throw new Error('git unavailable'); }, read);
        expect(fallback.map(entry => entry.line).sort()).toEqual(['source', 'untracked']);
        expect(reads).toEqual([join(root, 'packages/visible.ts'), join(root, 'packages/visible.ts'), join(root, 'untracked.txt')]);
    } finally { rmSync(root, { recursive: true, force: true }); }
});
