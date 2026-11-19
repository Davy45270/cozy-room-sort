import { spriteOf } from './atlas.ts';

// Petit constructeur DOM : jamais d'innerHTML pour du texte.
type Attrs = Record<string, string | number | boolean | undefined | ((e: Event) => void)>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: (Node | string | null | undefined | false)[]): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        if (value === undefined || value === false) continue;
        if (typeof value === 'function') el.addEventListener(key.replace(/^on/, '').toLowerCase(), value);
        else if (key === 'class') el.className = String(value);
        else if (key === 'text') el.textContent = String(value);
        else el.setAttribute(key, value === true ? '' : String(value));
    }
    for (const child of children) if (child !== null && child !== undefined && child !== false) el.append(child);
    return el;
}

const derivedUrls = import.meta.glob<string>('../../../content/assets/planches/derives/*.webp',
    { eager: true, query: '?url&no-inline', import: 'default' });

interface Rect { x: number; y: number; w: number; h: number }
/** Affiche la partie utile `hitbox` d'un cadre posé en (`x`, `y`) dans une image de largeur `width`. */
function cropped(src: string, width: number, at: { x: number; y: number }, hitbox: Rect, frameName: string, alt: string, className?: string): HTMLElement {
    const percent = (number: number, extent: number): string => `${number / extent * 100}%`;
    const image = h('img', {
        src, alt, draggable: 'false',
        style: `width:${percent(width, hitbox.w)};left:${percent(-at.x - hitbox.x, hitbox.w)};top:${percent(-at.y - hitbox.y, hitbox.h)}`
    });
    return h('span', {
        class: className ? `atlas-frame ${className}` : 'atlas-frame', 'data-frame': frameName,
        style: `--frame-ratio:${hitbox.w / hitbox.h};aspect-ratio:var(--frame-ratio)`
    }, image);
}

/** Affiche un cadre en masquant le reste de l'image de l'atlas. */
export function atlasImage(asset: string, alt = '', className?: string): HTMLElement {
    const { atlas, frame, hitbox } = spriteOf(asset);
    return cropped(atlas.image, atlas.w, frame, hitbox, `sprite-${asset}`, alt, className);
}

/** Fichier dérivé d'un cadre (`planches/<file>`), de mêmes dimensions et même partie utile que le cadre `from`. */
export function derivedImage(file: string, from: string, alt = '', className?: string): HTMLElement {
    const src = derivedUrls[`../../../content/assets/planches/${file}`];
    if (!src) throw new Error(`Fichier dérivé absent : ${file}`);
    const { frame, hitbox } = spriteOf(from);
    const name = file.slice(file.lastIndexOf('/') + 1, file.lastIndexOf('.'));
    return cropped(src, frame.w, { x: 0, y: 0 }, hitbox, `derive-${name}`, alt, className);
}

/** Vignette d'une pièce : le cadre de la planche s'il est sélectionné, sinon son état normal s'il en a un. */
export function roomChoiceImage(theme: { selecteur: string; selecteur_normal?: string }, selected: boolean): HTMLElement {
    return selected || !theme.selecteur_normal ? atlasImage(theme.selecteur) : derivedImage(theme.selecteur_normal, theme.selecteur);
}

/**
 * Style d'une image d'atlas (largeur `atlas.w`, hauteur `atlas.h`) qui montre seulement le rectangle `rect` d'un cadre posé
 * en `frame`, `rect` étant donné en pixels de la partie utile `hitbox` : le rectangle occupe toute la boîte qui contient
 * l'image, étiré au besoin dans les deux sens. La boîte doit masquer ce qui déborde (`overflow: hidden`).
 */
export function stretchedCropStyle(atlas: { w: number; h: number }, frame: { x: number; y: number }, hitbox: { x: number; y: number }, rect: Rect): string {
    const percent = (number: number, extent: number): string => `${number / extent * 100}%`;
    return `width:${percent(atlas.w, rect.w)};height:${percent(atlas.h, rect.h)};`
        + `left:${percent(-frame.x - hitbox.x - rect.x, rect.w)};top:${percent(-frame.y - hitbox.y - rect.y, rect.h)}`;
}

/** Un rectangle d'un cadre d'atlas, étiré sur toute sa boîte (taille donnée par le CSS). Aucun octet nouveau : l'atlas du cadre. */
export function atlasCrop(asset: string, rect: Rect, className?: string): HTMLElement {
    const { atlas, frame, hitbox } = spriteOf(asset);
    return h('span', {
        class: className ? `atlas-crop ${className}` : 'atlas-crop', 'aria-hidden': 'true',
        'data-frame': `sprite-${asset}`, 'data-crop': `${rect.x} ${rect.y} ${rect.w} ${rect.h}`
    }, h('img', { src: atlas.image, alt: '', draggable: 'false', style: stretchedCropStyle(atlas, frame, hitbox, rect) }));
}

/**
 * Bords d'un cadre d'atlas en 9 tranches, sans son centre : `slice` donne haut, droite, bas, gauche en pixels de la
 * partie utile du cadre ; les coins gardent leur taille (× `scale`), les bords s'étirent. Même découpe qu'un
 * `border-image` sans `fill`, construite en DOM parce qu'un `border-image` ne sait pas viser un cadre dans un atlas.
 */
export function atlasBorder(asset: string, slice: readonly [number, number, number, number], scale: number, className?: string): HTMLElement {
    const { atlas, frame, hitbox } = spriteOf(asset);
    const [top, right, bottom, left] = slice;
    const xs = [0, left, hitbox.w - right, hitbox.w];
    const ys = [0, top, hitbox.h - bottom, hitbox.h];
    const cells: HTMLElement[] = [];
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
        if (row === 1 && col === 1) continue;
        const x = xs[col]!, y = ys[row]!, w = xs[col + 1]! - x, h2 = ys[row + 1]! - y;
        cells.push(h('span', { class: 'border-cell', 'data-cell': `${row}${col}`, style: `grid-area:${row + 1}/${col + 1}` }, h('img', {
            src: atlas.image, alt: '', draggable: 'false', style: stretchedCropStyle(atlas, frame, hitbox, { x, y, w, h: h2 })
        })));
    }
    return h('span', {
        class: className ? `atlas-border ${className}` : 'atlas-border', 'aria-hidden': 'true',
        'data-frame': `sprite-${asset}`, 'data-slice': slice.join(' '),
        style: `grid-template-columns:${left * scale}px minmax(0,1fr) ${right * scale}px;grid-template-rows:${top * scale}px minmax(0,1fr) ${bottom * scale}px`
    }, ...cells);
}

export function iconButton(asset: string, label: string, onClick: () => void, extra: Attrs = {}): HTMLButtonElement {
    return h('button', { type: 'button', class: 'icon-button', 'aria-label': label, title: label, onclick: onClick, ...extra }, atlasImage(asset));
}

export function stars(count: number, total = 3): HTMLElement {
    const row = h('span', { class: 'stars', role: 'img', 'aria-label': `${count} étoile${count > 1 ? 's' : ''} sur ${total}` });
    for (let i = 0; i < total; i++) row.append(atlasImage('etoile', '', i < count ? 'star on' : 'star'));
    return row;
}
