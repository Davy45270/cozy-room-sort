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

/** Affiche un cadre en masquant le reste de l'image de l'atlas. */
export function atlasImage(asset: string, alt = '', className?: string): HTMLElement {
    const { atlas, frame, hitbox } = spriteOf(asset);
    const percent = (number: number, extent: number): string => `${number / extent * 100}%`;
    const image = h('img', {
        src: atlas.image, alt, draggable: 'false',
        style: `width:${percent(atlas.w, hitbox.w)};left:${percent(-frame.x - hitbox.x, hitbox.w)};top:${percent(-frame.y - hitbox.y, hitbox.h)}`
    });
    return h('span', {
        class: className ? `atlas-frame ${className}` : 'atlas-frame', 'data-frame': `sprite-${asset}`,
        style: `--frame-ratio:${hitbox.w / hitbox.h};aspect-ratio:var(--frame-ratio)`
    }, image);
}

export function iconButton(asset: string, label: string, onClick: () => void, extra: Attrs = {}): HTMLButtonElement {
    return h('button', { type: 'button', class: 'icon-button', 'aria-label': label, title: label, onclick: onClick, ...extra }, atlasImage(asset));
}

export function stars(count: number, total = 3): HTMLElement {
    const row = h('span', { class: 'stars', role: 'img', 'aria-label': `${count} étoile${count > 1 ? 's' : ''} sur ${total}` });
    for (let i = 0; i < total; i++) row.append(atlasImage('etoile', '', i < count ? 'star on' : 'star'));
    return row;
}
