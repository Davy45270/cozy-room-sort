// Planche de contrôle de l'art (relecture humaine, hors CI) : node tools/art-sheet.ts [sortie.png]
// Nécessite rsvg-convert. Écrit une grille de tous les objets puis des cartons, sur fond clair et sur fond sombre.
import { execFileSync } from 'node:child_process';
import { ASSETS, boxSvg, objectSvg, PICTOS } from '@cozy-room-sort/art';

const out = process.argv[2] ?? 'docs/art-sheet.png';
const cell = 96;
const cols = 12;
const items = [...ASSETS.map(a => objectSvg(a, 80)), ...Object.keys(PICTOS).map(p => boxSvg(p, 80))];
const darkItems = [...ASSETS.map(a => objectSvg(a, 80, '#E9D8BC')), ...Object.keys(PICTOS).map(p => boxSvg(p, 80))];
const rows = Math.ceil(items.length / cols);
const half = rows * cell;
const place = (svg: string, i: number, dy: number): string =>
    svg.replace('<svg ', `<svg x="${(i % cols) * cell + 8}" y="${Math.floor(i / cols) * cell + 8 + dy}" `);
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cell}" height="${half * 2}">`
    + `<rect width="100%" height="${half}" fill="#F7EEDF"/><rect y="${half}" width="100%" height="${half}" fill="#2E2420"/>`
    + items.map((s, i) => place(s, i, 0)).join('') + darkItems.map((s, i) => place(s, i, half)).join('') + '</svg>';
execFileSync('rsvg-convert', ['-o', out], { input: sheet });
console.log(`${items.length} dessins → ${out}`);
