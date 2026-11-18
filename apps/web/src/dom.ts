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

/** Image d'un SVG produit par code, en URL data (pas de requête réseau). */
export function svgImage(svg: string, alt: string, className?: string): HTMLImageElement {
    return h('img', { src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, alt, class: className, draggable: 'false' });
}

export const ICONS = {
    home: 'M4 11 12 4l8 7v9h-5v-6H9v6H4Z',
    restart: 'M5 12a7 7 0 1 0 2.1-5M5 4v4h4',
    undo: 'M9 7 4 12l5 5M4 12h10a6 6 0 0 1 0 12',
    hint: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3Z',
    settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-4l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
    back: 'M15 5 8 12l7 7',
    star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z',
    lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5Z'
} as const;

export function icon(name: keyof typeof ICONS, filled = false): SVGSVGElement {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('icon');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', ICONS[name]);
    path.setAttribute('fill', filled ? 'currentColor' : 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.append(path);
    return svg;
}

export function iconButton(name: keyof typeof ICONS, label: string, onClick: () => void, extra: Attrs = {}): HTMLButtonElement {
    return h('button', { type: 'button', class: 'icon-button', 'aria-label': label, title: label, onclick: onClick, ...extra }, icon(name));
}

export function stars(count: number, total = 3): HTMLElement {
    const row = h('span', { class: 'stars', role: 'img', 'aria-label': `${count} étoile${count > 1 ? 's' : ''} sur ${total}` });
    for (let i = 0; i < total; i++) { const s = icon('star', i < count); s.classList.toggle('on', i < count); row.append(s); }
    return row;
}
