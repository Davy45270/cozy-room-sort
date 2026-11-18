// Cartons : une face de carton avec une étiquette qui montre un objet type de la catégorie.
import { objectSvg } from './objects.ts';
import { COLORS, INK, shade } from './palette.ts';

/** Picto (nom des thèmes) → objet type dessiné sur l'étiquette. */
export const PICTOS: Readonly<Record<string, string>> = {
    book: 'livre-canard', cushion: 'coussin-moutarde', plant: 'plante-fougere', frame: 'cadre-paysage', lamp: 'lampe-moutarde',
    teddy: 'ours-bois', shirt: 'pull-terracotta', candle: 'bougie-rose', plate: 'assiette-ciel', whisk: 'fouet-bois',
    jar: 'bocal-pates', flower: 'vase-rose', towel: 'torchon-carreaux'
};

/** Familles d'objets admises dans chaque catégorie des thèmes. */
export const CATEGORY_FAMILIES: Readonly<Record<string, readonly string[]>> = {
    livres: ['livre'], coussins: ['coussin', 'plaid'], plantes: ['plante'], cadres: ['cadre'], lumieres: ['lampe'],
    peluches: ['ours', 'lapin', 'chat'], linge: ['pull', 'tshirt', 'chaussette'], veilleuses: ['bougie', 'veilleuse'],
    vaisselle: ['assiette', 'tasse', 'bol'], ustensiles: ['fouet', 'louche', 'spatule'], epicerie: ['bocal', 'pot', 'boite'],
    fleurs: ['vase'], torchons: ['torchon']
};

export function boxSvg(picto: string, size = 128): string {
    const asset = PICTOS[picto];
    if (asset === undefined) throw new Error(`picto inconnu : ${picto}`);
    const card = shade(COLORS.bois, 0.35);
    const label = objectSvg(asset, 52).replace('<svg ', '<svg x="38" y="40" ');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="${size}" height="${size}">`
        + `<path d="M14 34 L30 18 H98 L114 34Z" fill="${shade(card, -0.15)}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`
        + `<rect x="14" y="34" width="100" height="80" rx="6" fill="${card}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`
        + `<rect x="34" y="38" width="60" height="58" rx="8" fill="${COLORS.creme}" stroke="${INK}" stroke-width="3.5"/>`
        + label
        + `<path d="M64 34v4" stroke="${INK}" stroke-width="3.5"/></svg>`;
}
