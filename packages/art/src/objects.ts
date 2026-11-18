// Objets à ranger, dessinés par code dans une boîte de 128 × 128. Un objet = une famille + une variante.
// Contour épais couleur encre, aplats de la palette commune, un reflet clair : le même trait partout.
import { COLORS, INK, shade, type ColorName } from './palette.ts';

const S = `stroke="${INK}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"`;
const T = `stroke="${INK}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"`;
const c = (name: ColorName): string => COLORS[name];
const eyes = (x1: number, x2: number, y: number): string =>
    `<circle cx="${x1}" cy="${y}" r="4" fill="${INK}"/><circle cx="${x2}" cy="${y}" r="4" fill="${INK}"/>`;

type Draw = (variant: string) => string;
interface Family { variants: readonly string[]; draw: Draw }

const colorFamily = (variants: readonly ColorName[], draw: (color: string) => string): Family =>
    ({ variants, draw: v => draw(c(v as ColorName)) });

export const FAMILIES: Readonly<Record<string, Family>> = {
    livre: colorFamily(['terracotta', 'canard', 'moutarde', 'lavande'], col => `
        <rect x="34" y="14" width="56" height="100" rx="6" fill="${col}" ${S}/>
        <rect x="34" y="14" width="14" height="100" rx="4" fill="${shade(col, -0.2)}" ${T}/>
        <path d="M58 34h22M58 46h16" ${T} fill="none"/>
        <rect x="56" y="88" width="26" height="10" rx="3" fill="${shade(col, 0.45)}" ${T}/>`),
    coussin: colorFamily(['moutarde', 'rose', 'sauge', 'ciel'], col => `
        <path d="M18 30 Q64 14 110 30 Q118 64 110 98 Q64 114 18 98 Q10 64 18 30Z" fill="${col}" ${S}/>
        <path d="M30 40 Q64 30 98 40" fill="none" stroke="${shade(col, 0.45)}" stroke-width="6" stroke-linecap="round"/>
        <circle cx="64" cy="64" r="7" fill="${shade(col, -0.25)}" ${T}/>`),
    plaid: colorFamily(['rose', 'canard', 'terracotta'], col => `
        <rect x="14" y="36" width="100" height="56" rx="12" fill="${col}" ${S}/>
        <path d="M14 56h100M14 72h100" stroke="${shade(col, 0.4)}" stroke-width="7"/>
        <path d="M24 92v14M40 92v14M56 92v14M72 92v14M88 92v14M104 92v14" ${T}/>`),
    plante: {
        variants: ['fougere', 'cactus', 'ronde'],
        draw: v => {
            const pot = `<path d="M38 82h52l-7 34H45Z" fill="${c('terracotta')}" ${S}/><rect x="34" y="74" width="60" height="12" rx="4" fill="${shade(c('terracotta'), 0.2)}" ${S}/>`;
            if (v === 'cactus') return `<rect x="50" y="22" width="28" height="58" rx="14" fill="${c('sauge')}" ${S}/>
                <path d="M50 52h-10a8 8 0 0 1-8-8v-12" fill="none" ${S}/><path d="M78 44h10a8 8 0 0 0 8-8v-8" fill="none" ${S}/>${pot}`;
            if (v === 'ronde') return `<circle cx="64" cy="48" r="32" fill="${c('sauge')}" ${S}/>
                <circle cx="52" cy="40" r="8" fill="${shade(c('sauge'), 0.3)}"/>${pot}`;
            return `<path d="M64 76 C40 60 22 40 26 16 C46 30 58 50 64 76Z" fill="${c('sauge')}" ${S}/>
                <path d="M64 76 C88 60 106 40 102 16 C82 30 70 50 64 76Z" fill="${shade(c('sauge'), -0.15)}" ${S}/>
                <path d="M64 76 C60 52 62 30 64 10 C68 30 70 52 64 76Z" fill="${shade(c('sauge'), 0.15)}" ${S}/>${pot}`;
        }
    },
    cadre: {
        variants: ['paysage', 'fleur', 'lune'],
        draw: v => {
            const inner = v === 'fleur'
                ? `<circle cx="64" cy="58" r="9" fill="${c('moutarde')}" ${T}/><path d="M64 68v22" ${T}/>
                   <circle cx="52" cy="54" r="8" fill="${c('rose')}" ${T}/><circle cx="76" cy="54" r="8" fill="${c('rose')}" ${T}/>`
                : v === 'lune'
                    ? `<rect x="30" y="34" width="68" height="60" fill="${c('lavande')}"/><path d="M70 46a16 16 0 1 0 8 28a13 13 0 1 1-8-28Z" fill="${c('creme')}" ${T}/>`
                    : `<rect x="30" y="34" width="68" height="60" fill="${c('ciel')}"/><circle cx="80" cy="48" r="8" fill="${c('moutarde')}"/>
                       <path d="M30 94 L52 62 L68 80 L80 68 L98 94Z" fill="${c('sauge')}" ${T}/>`;
            return `<rect x="18" y="22" width="92" height="84" rx="6" fill="${c('bois')}" ${S}/>
                <rect x="30" y="34" width="68" height="60" fill="${c('creme')}" ${T}/>${inner}
                <rect x="30" y="34" width="68" height="60" fill="none" ${T}/>`;
        }
    },
    lampe: colorFamily(['moutarde', 'creme', 'sauge'], col => `
        <path d="M36 54 L48 16 H80 L92 54Z" fill="${col}" ${S}/>
        <path d="M64 54v42" ${S}/>
        <path d="M40 112 Q64 92 88 112Z" fill="${c('bois')}" ${S}/>
        <path d="M54 26h20" stroke="${shade(col, 0.5)}" stroke-width="5" stroke-linecap="round"/>`),
    ours: colorFamily(['bois', 'moutarde', 'creme'], col => `
        <circle cx="38" cy="30" r="13" fill="${col}" ${S}/><circle cx="90" cy="30" r="13" fill="${col}" ${S}/>
        <ellipse cx="64" cy="94" rx="34" ry="26" fill="${col}" ${S}/>
        <circle cx="64" cy="50" r="30" fill="${col}" ${S}/>
        <ellipse cx="64" cy="60" rx="13" ry="10" fill="${shade(col, 0.45)}" ${T}/>
        ${eyes(52, 76, 44)}<circle cx="64" cy="57" r="4" fill="${INK}"/>`),
    lapin: colorFamily(['creme', 'rose', 'ciel'], col => `
        <ellipse cx="50" cy="26" rx="10" ry="22" fill="${col}" ${S}/><ellipse cx="78" cy="26" rx="10" ry="22" fill="${col}" ${S}/>
        <ellipse cx="64" cy="96" rx="30" ry="24" fill="${col}" ${S}/>
        <circle cx="64" cy="60" r="26" fill="${col}" ${S}/>
        ${eyes(54, 74, 56)}<path d="M60 68 Q64 72 68 68" fill="none" ${T}/>`),
    chat: colorFamily(['moutarde', 'lavande', 'creme'], col => `
        <path d="M36 46 L40 14 L60 34Z" fill="${col}" ${S}/><path d="M92 46 L88 14 L68 34Z" fill="${col}" ${S}/>
        <ellipse cx="64" cy="96" rx="32" ry="24" fill="${col}" ${S}/>
        <circle cx="64" cy="56" r="30" fill="${col}" ${S}/>
        ${eyes(52, 76, 54)}<path d="M58 66 Q64 72 70 66" fill="none" ${T}/><path d="M30 60h12M86 60h12" ${T}/>`),
    pull: colorFamily(['terracotta', 'canard', 'moutarde'], col => `
        <path d="M44 18 L24 28 L10 70 L28 76 L36 52 V112 H92 V52 L100 76 L118 70 L104 28 L84 18 Q64 32 44 18Z" fill="${col}" ${S}/>
        <path d="M36 100h56" stroke="${shade(col, 0.4)}" stroke-width="6"/>`),
    tshirt: colorFamily(['ciel', 'rose', 'sauge'], col => `
        <path d="M46 20 L20 32 L28 56 L40 52 V110 H88 V52 L100 56 L108 32 L82 20 Q64 34 46 20Z" fill="${col}" ${S}/>
        <circle cx="64" cy="74" r="10" fill="${shade(col, 0.5)}" ${T}/>`),
    chaussette: colorFamily(['lavande', 'terracotta', 'moutarde'], col => `
        <path d="M44 14 H76 V72 L96 88 Q104 108 84 112 L48 104 Q36 100 40 86Z" fill="${col}" ${S}/>
        <rect x="42" y="14" width="36" height="16" rx="3" fill="${shade(col, 0.45)}" ${T}/>
        <path d="M66 100 Q78 104 88 100" fill="none" stroke="${shade(col, -0.25)}" stroke-width="6" stroke-linecap="round"/>`),
    bougie: colorFamily(['rose', 'creme', 'sauge'], col => `
        <rect x="36" y="52" width="56" height="60" rx="10" fill="${col}" ${S}/>
        <path d="M64 52v-12" ${T}/>
        <path d="M64 12 Q76 28 64 40 Q52 28 64 12Z" fill="${c('moutarde')}" ${T}/>
        <rect x="36" y="74" width="56" height="12" fill="${shade(col, -0.15)}" ${T}/>`),
    veilleuse: {
        variants: ['lune', 'etoile'],
        draw: v => {
            const top = v === 'lune'
                ? `<path d="M76 14a34 34 0 1 0 18 62a28 28 0 1 1-18-62Z" fill="${c('moutarde')}" ${S}/>`
                : `<path d="M64 10 L74 38 L104 40 L80 58 L88 88 L64 70 L40 88 L48 58 L24 40 L54 38Z" fill="${c('moutarde')}" ${S}/>`;
            return `${top}<rect x="38" y="94" width="52" height="20" rx="8" fill="${c('lavande')}" ${S}/>`;
        }
    },
    assiette: colorFamily(['ciel', 'creme', 'rose'], col => `
        <ellipse cx="64" cy="70" rx="54" ry="30" fill="${col}" ${S}/>
        <ellipse cx="64" cy="66" rx="32" ry="16" fill="${shade(col, 0.4)}" ${T}/>`),
    tasse: colorFamily(['terracotta', 'canard', 'moutarde'], col => `
        <path d="M86 50 h8 a16 16 0 0 1 0 32 h-8" fill="none" ${S}/>
        <path d="M24 40 H90 V86 Q90 108 68 108 H46 Q24 108 24 86Z" fill="${col}" ${S}/>
        <ellipse cx="57" cy="40" rx="33" ry="8" fill="${shade(col, -0.3)}" ${T}/>
        <path d="M48 16 Q42 24 48 30M64 14 Q58 22 64 30" fill="none" ${T}/>`),
    bol: colorFamily(['sauge', 'ciel', 'lavande'], col => `
        <path d="M14 52 H114 Q112 106 64 108 Q16 106 14 52Z" fill="${col}" ${S}/>
        <ellipse cx="64" cy="52" rx="50" ry="10" fill="${shade(col, 0.35)}" ${T}/>
        <path d="M30 78 Q64 90 98 78" fill="none" stroke="${shade(col, 0.45)}" stroke-width="6" stroke-linecap="round"/>`),
    fouet: colorFamily(['bois', 'canard'], col => `
        <rect x="56" y="76" width="16" height="44" rx="7" fill="${col}" ${S}/>
        <path d="M64 76 C34 60 38 10 64 8 C90 10 94 60 64 76Z" fill="${c('creme')}" ${S}/>
        <path d="M64 76 C50 56 52 16 64 8 C76 16 78 56 64 76Z" fill="none" ${T}/>`),
    louche: colorFamily(['bois', 'terracotta'], col => `
        <rect x="58" y="8" width="12" height="66" rx="6" fill="${col}" ${S}/>
        <path d="M32 74 H96 Q96 116 64 116 Q32 116 32 74Z" fill="${c('ciel')}" ${S}/>`),
    spatule: colorFamily(['bois', 'sauge'], col => `
        <rect x="58" y="64" width="12" height="56" rx="6" fill="${col}" ${S}/>
        <rect x="38" y="8" width="52" height="60" rx="14" fill="${shade(col, 0.2)}" ${S}/>
        <path d="M54 22v32M64 22v32M74 22v32" ${T}/>`),
    bocal: {
        variants: ['pates', 'riz', 'biscuits'],
        draw: v => {
            const fill = v === 'pates' ? c('moutarde') : v === 'riz' ? c('creme') : c('bois');
            return `<rect x="30" y="30" width="68" height="84" rx="14" fill="${shade(c('ciel'), 0.6)}" ${S}/>
                <rect x="36" y="58" width="56" height="50" rx="10" fill="${fill}" ${T}/>
                <rect x="36" y="14" width="56" height="18" rx="5" fill="${c('terracotta')}" ${S}/>
                <path d="M42 44 v8" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/>`;
        }
    },
    pot: colorFamily(['moutarde', 'terracotta'], col => `
        <path d="M30 44 H98 L92 108 Q64 118 36 108Z" fill="${col}" ${S}/>
        <path d="M24 30 Q64 14 104 30 L98 44 H30Z" fill="${c('rose')}" ${S}/>
        <path d="M44 62 Q64 72 84 62" fill="none" stroke="${shade(col, 0.45)}" stroke-width="6" stroke-linecap="round"/>`),
    boite: colorFamily(['canard', 'prune', 'sauge'], col => `
        <rect x="22" y="40" width="84" height="72" rx="8" fill="${col}" ${S}/>
        <rect x="18" y="28" width="92" height="20" rx="6" fill="${shade(col, -0.2)}" ${S}/>
        <circle cx="64" cy="76" r="14" fill="${shade(col, 0.5)}" ${T}/>`),
    vase: colorFamily(['rose', 'moutarde', 'lavande'], col => `
        <path d="M64 70 V40M64 70 L44 30M64 70 L84 30" fill="none" ${S}/>
        <circle cx="64" cy="30" r="12" fill="${col}" ${S}/><circle cx="42" cy="26" r="11" fill="${shade(col, 0.25)}" ${S}/><circle cx="86" cy="26" r="11" fill="${shade(col, -0.15)}" ${S}/>
        <path d="M46 70 H82 Q96 92 82 116 H46 Q32 92 46 70Z" fill="${c('ciel')}" ${S}/>`),
    torchon: {
        variants: ['carreaux', 'rayures', 'uni'],
        draw: v => {
            const motif = v === 'carreaux'
                ? `<path d="M46 20v92M64 20v92M82 20v92M28 44h72M28 68h72M28 92h72" stroke="${c('terracotta')}" stroke-width="5"/>`
                : v === 'rayures' ? `<path d="M28 40h72M28 56h72" stroke="${c('canard')}" stroke-width="7"/>` : '';
            return `<rect x="28" y="20" width="72" height="92" rx="6" fill="${c('creme')}" ${S}/>${motif}
                <rect x="28" y="20" width="72" height="92" rx="6" fill="none" ${S}/>
                <rect x="52" y="10" width="24" height="14" rx="6" fill="none" ${T}/>`;
        }
    }
};

/** Tous les identifiants d'objets : « famille-variante ». */
export const ASSETS: readonly string[] = Object.entries(FAMILIES).flatMap(([family, f]) => f.variants.map(v => `${family}-${v}`));

/**
 * SVG d'un objet. `sticker` entoure l'objet d'un liseré de cette couleur : sur un fond sombre, il garde le
 * contour encre lisible (mode sombre de la palette).
 */
export function objectSvg(asset: string, size = 128, sticker?: string): string {
    const cut = asset.indexOf('-');
    const family = FAMILIES[asset.slice(0, cut)];
    const variant = asset.slice(cut + 1);
    if (!family || !family.variants.includes(variant)) throw new Error(`objet inconnu : ${asset}`);
    const body = family.draw(variant).replace(/\s*\n\s*/g, '');
    const content = sticker === undefined ? body
        : `<filter id="s" x="-10%" y="-10%" width="120%" height="120%"><feMorphology in="SourceAlpha" operator="dilate" radius="4" result="d"/>`
          + `<feFlood flood-color="${sticker}"/><feComposite operator="in" in2="d" result="o"/>`
          + `<feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge></filter><g filter="url(#s)">${body}</g>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="${size}" height="${size}">${content}</svg>`;
}

/** Silhouette d'un objet masqué : même forme, sans couleur ni détail lisible. */
export function silhouetteSvg(asset: string, fill: string, size = 128): string {
    return objectSvg(asset, size).replace(/fill="#[0-9A-Fa-f]{6}"/g, `fill="${fill}"`).replace(/stroke="#[0-9A-Fa-f]{6}"/g, `stroke="${fill}"`);
}
