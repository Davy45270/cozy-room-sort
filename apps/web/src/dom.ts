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

export function iconButton(asset: string, label: string, onClick: () => void, extra: Attrs = {}): HTMLButtonElement {
    return h('button', { type: 'button', class: 'icon-button', 'aria-label': label, title: label, onclick: onClick, ...extra }, atlasImage(asset));
}

export function stars(count: number, total = 3): HTMLElement {
    const row = h('span', { class: 'stars', role: 'img', 'aria-label': `${count} étoile${count > 1 ? 's' : ''} sur ${total}` });
    for (let i = 0; i < total; i++) row.append(atlasImage('etoile', '', i < count ? 'star on' : 'star'));
    return row;
}
