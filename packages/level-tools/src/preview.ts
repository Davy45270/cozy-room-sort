import { readFileSync } from 'node:fs';
import { createInitialState, isAccessible } from '@cozy-room-sort/engine';
import { findTheme } from '@cozy-room-sort/generator';
import type { Level } from '@cozy-room-sort/schemas';
import { drawOrder, layoutRoom, roomView, type Placed } from '../../../apps/web/src/scene/layout.ts';
import provenance from '../../../content/assets/provenance.json' with { type: 'json' };

interface Atlas {
    frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
    meta: { size: { w: number; h: number }; image: string };
}

const atlasFolder = new URL('../../../content/assets/planches/atlas/', import.meta.url);
const assets = new Map(provenance.map(entry => [entry.id, entry.atlas]));
export const PREVIEW_WIDTH = 960;
export const PREVIEW_HEIGHT = 880;

const escape = (text: string): string => text.replace(/[&<>"']/g, char =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

export function previewHtml(level: Level): string {
    const atlases = new Map<string, Atlas>();
    const images = new Set<string>();
    const sprite = (asset: string, size: number, style = '', hidden = false, objectId?: string): string => {
        const name = assets.get(asset);
        if (!name) throw new Error(`Cadre absent : ${asset}`);
        let atlas = atlases.get(name);
        if (!atlas) {
            atlas = JSON.parse(readFileSync(new URL(`${name}.json`, atlasFolder), 'utf8')) as Atlas;
            atlases.set(name, atlas);
        }
        const { x, y, w, h } = atlas.frames[`sprite-${asset}`]!.frame;
        const image = new URL(atlas.meta.image, atlasFolder).href.replaceAll("'", '%27');
        images.add(image);
        const sx = size / w;
        const sy = size / h;
        return `<span class="sprite${hidden ? ' hidden' : ''}" data-frame="${escape(asset)}"${objectId ? ` data-object="${escape(objectId)}"` : ''} aria-hidden="true" style="
            width:${size}px;height:${size}px;background-image:url('${escape(image)}');
            background-size:${atlas.meta.size.w * sx}px ${atlas.meta.size.h * sy}px;
            background-position:${-x * sx}px ${-y * sy}px;${style}"></span>`;
    };
    const at = ({ x, y }: Placed): string => `position:absolute;left:${x}px;top:${y}px;transform:translate(-50%,-50%);`;
    const theme = findTheme(level.theme);
    const state = createInitialState(level);
    const viewport = { width: PREVIEW_WIDTH, height: 650 };
    const view = roomView(viewport);
    const placed = layoutRoom(level, viewport);
    const objects = new Map(level.objects.map(object => [object.id, object]));
    const scene = drawOrder(level).map(id => {
        const object = objects.get(id)!;
        const position = placed.get(id)!;
        return sprite(object.asset, position.size, at(position), object.hidden === true && !isAccessible(level, state, id), id);
    });
    const background = sprite(theme.vue, view.size, at(view));
    const boxes = level.boxes.map(box => {
        const category = theme.categories.find(item => item.id === box.category);
        if (!category) throw new Error(`Catégorie absente : ${box.category}`);
        const active = state.activeBoxIds.includes(box.id);
        return `<li class="${active ? '' : 'pending'}">${sprite('carton-ouvert', 46)}${sprite(category.icone, 30)}
            <span>${escape(category.label)} · 0/${box.capacity}<br>${active ? 'Actif' : 'En attente'}</span></li>`;
    }).join('');
    const buffer = Array.from({ length: level.rules.bufferCapacity }, () => sprite('case-tampon', 38)).join('');
    const preloads = [...images].map(image => `<img class="preload" alt="" src="${escape(image)}">`).join('');

    return `<!doctype html><html lang="fr"><meta charset="utf-8"><title>${escape(level.name)}</title>
<style>
    *{box-sizing:border-box} body{margin:0;background:#f6efe3;color:#3b2a22;font:15px sans-serif}
    h1{text-align:center;margin:0;height:50px;padding:12px;font-size:22px}
    main{position:relative;height:${viewport.height}px}
    .sprite{display:inline-block;background-repeat:no-repeat;flex:none}
    .hidden{filter:brightness(0)} .preload{position:absolute;width:0;height:0}
    footer{padding:6px 18px;display:grid;gap:8px}
    ul{margin:0;padding:0;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));list-style:none}
    li,.buffer{display:flex;align-items:center;gap:4px} .pending{opacity:.65}
    .buffer{justify-content:center;gap:8px}
</style>
<body><h1>${escape(level.name)} · ${escape(theme.label)}</h1>
<main aria-label="${escape(theme.label)}">${background}${scene.join('')}</main>
<footer><ul aria-label="Cartons">${boxes}</ul><div class="buffer">Tampon ${buffer}</div></footer>
${preloads}</body></html>`;
}
