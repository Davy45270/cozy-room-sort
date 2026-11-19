import provenance from '../../../content/assets/provenance.json';

export interface Rectangle { x: number; y: number; w: number; h: number }
interface AtlasHash {
    frames: Record<string, { frame: Rectangle }>;
    meta: { size: { w: number; h: number } };
}

const manifests = import.meta.glob<AtlasHash>(
    ['../../../content/assets/planches/atlas/*.json', '!../../../content/assets/planches/atlas/*-meubles.json', '!../../../content/assets/planches/atlas/p04-ui.json'],
    { eager: true, import: 'default' }
);
const jsonUrls = import.meta.glob<string>(
    ['../../../content/assets/planches/atlas/*.json', '!../../../content/assets/planches/atlas/*-meubles.json', '!../../../content/assets/planches/atlas/p04-ui.json'],
    { eager: true, query: '?url&no-inline', import: 'default' }
);
const imageUrls = import.meta.glob<string>(
    ['../../../content/assets/planches/atlas/*.webp', '!../../../content/assets/planches/atlas/*-meubles.webp', '!../../../content/assets/planches/atlas/p04-ui.webp'],
    { eager: true, query: '?url&no-inline', import: 'default' }
);

export interface Atlas { key: string; json: string; image: string; w: number; h: number }
interface Sprite { atlas: Atlas; key: string; frame: Rectangle; hitbox: Rectangle }

const frames = new Map<string, Sprite>();
const usefulBounds = new Map(provenance.map(entry => [`${entry.atlas}/sprite-${entry.id}`, entry.hitbox]));
for (const [path, manifest] of Object.entries(manifests)) {
    const basename = path.slice(0, -5);
    const key = basename.slice(basename.lastIndexOf('/') + 1);
    const json = jsonUrls[path];
    const image = imageUrls[`${basename}.webp`];
    if (!json || !image) throw new Error(`Atlas incomplet : ${key}`);
    const atlas: Atlas = { key, json, image, ...manifest.meta.size };
    for (const [frameKey, { frame }] of Object.entries(manifest.frames)) {
        const hitbox = usefulBounds.get(`${key}/${frameKey}`);
        if (!hitbox || frames.has(frameKey)) throw new Error(`Cadre sans provenance ou ambigu : ${key}/${frameKey}`);
        frames.set(frameKey, { atlas, key: frameKey, frame, hitbox });
    }
}

export function spriteOf(asset: string): Sprite {
    const sprite = frames.get(`sprite-${asset}`);
    if (!sprite) throw new Error(`Cadre absent : ${asset}`);
    return sprite;
}
