// Icônes PWA : un carton crème portant un coussin moutarde, sur fond crème. À lancer à la main
// (outil de création, pas de la CI) : node scripts/make-icons.js   (nécessite rsvg-convert)
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { boxSvg } from '@cozy-room-sort/art';

const motif = boxSvg('cushion', 100).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
// `marge` : part du côté laissée vide (la version « maskable » garde le motif dans la zone sûre de 80 %).
const icone = (marge) => {
    const echelle = (1 - 2 * marge) * (100 / 128);
    const decalage = 100 * marge;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#F7EEDF"/>`
        + `<g transform="translate(${decalage} ${decalage}) scale(${echelle})">${motif}</g></svg>`;
};
mkdirSync('apps/web/public/icons', { recursive: true });
for (const [nom, taille, marge] of [['192', 192, 0.04], ['512', 512, 0.04], ['maskable-512', 512, 0.14]]) {
    execFileSync('rsvg-convert', ['-w', String(taille), '-h', String(taille), '-o', `apps/web/public/icons/cozy-room-sort-${nom}.png`], { input: icone(marge) });
}
