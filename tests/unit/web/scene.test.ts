// @vitest-environment happy-dom
// La scène tourne sur un Phaser d'essai qui enregistre ce que la scène demande à ses images ; le crochet de test
// `images()` rend ensuite cet état (cadre, visibilité, opacité, mode de teinte, marque « ? »).
import type { Level } from '@cozy-room-sort/schemas';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('phaser', () => {
    const TintModes = { MULTIPLY: 0, FILL: 1 } as const;
    class Rectangle {
        x = 0; y = 0; width = 0; height = 0;
        setTo(x: number, y: number, width: number, height: number): this { Object.assign(this, { x, y, width, height }); return this; }
        contains(x: number, y: number): boolean { return x >= this.x && y >= this.y && x < this.x + this.width && y < this.y + this.height; }
    }
    class Image {
        visible = true; alpha = 1; tintMode: number = TintModes.MULTIPLY; tint = 0xffffff;
        x = 0; y = 0; displayWidth = 0; displayHeight = 0; scale = 1; depth = 0; originX = .5; originY = .5;
        input?: { hitArea: Rectangle; enabled: boolean };
        frame: { name: string };
        constructor(frame: string) { this.frame = { name: frame }; }
        setDepth(depth: number): this { this.depth = depth; return this; }
        setPosition(x: number, y: number): this { this.x = x; this.y = y; return this; }
        setDisplaySize(width: number, height: number): this { this.displayWidth = width; this.displayHeight = height; return this; }
        setOrigin(x: number, y: number): this { this.originX = x; this.originY = y; return this; }
        setScale(scale: number): this { this.scale = scale; return this; }
        setInteractive(config: { hitArea: Rectangle }): this { this.input = { hitArea: config.hitArea, enabled: true }; return this; }
        disableInteractive(): this { return this; }
        on(): this { return this; }
        setTint(tint: number): this { this.tint = tint; return this; }
        clearTint(): this { this.tint = 0xffffff; return this; }
        setTintMode(mode: number): this { this.tintMode = mode; return this; }
        setAlpha(alpha: number): this { this.alpha = alpha; return this; }
        setVisible(visible: boolean): this { this.visible = visible; return this; }
        getBounds(): Rectangle { return new Rectangle(); }
        destroy(): void {}
        /** Rendu Canvas d'essai (comme celui de Phaser, il lit l'image passée, pas `this`) : note le filtre du contexte. */
        filters: string[] = [];
        renderCanvas(renderer: { currentContext: { filter: string } }, source: Image): void { source.filters.push(renderer.currentContext.filter); }
    }
    class Text {
        text: string;
        constructor(text: string) { this.text = text; }
        setOrigin(): this { return this; }
        setDepth(): this { return this; }
        setFontSize(): this { return this; }
        setPosition(): this { return this; }
        destroy(): void {}
    }
    // Texture de canevas d'essai : enregistre chaque peinture (arrêts du dégradé, rectangle rempli) et chaque rafraîchissement.
    class CanvasTexture {
        paints: { stops: [number, string][]; fill: number[] }[] = [];
        refreshed = 0;
        width: number; height: number;
        constructor(width: number, height: number) { this.width = width; this.height = height; }
        getContext() {
            const paints = this.paints;
            let stops: [number, string][] = [];
            return {
                fillStyle: '' as unknown,
                clearRect: () => undefined,
                createLinearGradient: () => { stops = []; return { addColorStop: (at: number, color: string) => stops.push([at, color]) }; },
                fillRect: (x: number, y: number, w: number, h: number) => paints.push({ stops, fill: [x, y, w, h] })
            };
        }
        refresh(): this { this.refreshed++; return this; }
    }
    const rect = (): DOMRect => ({ left: 0, top: 0, x: 0, y: 0, width: 390, height: 390, right: 390, bottom: 390, toJSON: () => ({}) });
    class Scene {
        add = { image: (_x: number, _y: number, _key: string, frame: string) => new Image(frame), text: (_x: number, _y: number, text: string) => new Text(text) };
        load = { atlas: () => undefined };
        textures = { getPixelAlpha: vi.fn((): number => 0), createCanvas: vi.fn((_key: string, w: number, h: number) => new CanvasTexture(w, h)) };
        scale = { on: () => undefined, off: () => undefined, refresh: () => undefined };
        events = { once: () => undefined };
        tweens = { add: () => undefined, killTweensOf: () => undefined };
        game = { canvas: { getBoundingClientRect: rect }, renderer: { type: 2 }, events: { once: () => undefined } };
    }
    const Phaser = { Scene, TintModes, CANVAS: 1, WEBGL: 2, Geom: { Rectangle }, Math: { Clamp: (v: number, a: number, b: number) => Math.min(b, Math.max(a, v)) } };
    return { default: Phaser };
});

const { levelById, themeOf } = await import('../../../apps/web/src/content.ts');
const { createController } = await import('../../../apps/web/src/game/controller.ts');
const { RoomScene, SILHOUETTE } = await import('../../../apps/web/src/scene/room-scene.ts');
const { installTestHooks } = await import('../../../apps/web/src/test-hooks.ts');
const { default: Phaser } = await import('phaser');

afterEach(() => { window.history.replaceState(null, '', '/'); });

function mount(source: string | Level, target: Element | null = null) {
    const level = typeof source === 'string' ? levelById(source)! : source;
    const controller = createController(level, 'classique', { save: () => Promise.resolve(), now: () => 0 });
    const room = document.createElement('section');
    room.getBoundingClientRect = () => ({ left: 0, top: 0, x: 0, y: 0, width: 390, height: 390, right: 390, bottom: 390, toJSON: () => ({}) });
    const scene = new RoomScene(room, { controller, targetOf: () => target, bufferSlot: () => null, onReady: () => undefined });
    scene.create();
    window.history.replaceState(null, '', '/?test=1');
    const remove = installTestHooks(controller, scene);
    const images = () => window.__cozy!.images();
    return { level, controller, images, remove, room, scene };
}

it('le crochet des images n’existe qu’en mode test', () => {
    const level = levelById('001-salon')!;
    const controller = createController(level, 'classique', { save: () => Promise.resolve(), now: () => 0 });
    const scene = new RoomScene(document.createElement('section'), { controller, targetOf: () => null, bufferSlot: () => null, onReady: () => undefined });
    installTestHooks(controller, scene);
    expect(window.__cozy).toBeUndefined();
});

it('le fond de la pièce et le chat sont visibles et opaques, chacun avec son cadre', () => {
    for (const id of ['001-salon', '011-chambre', '015-salle-de-bain']) {
        const { level, images, remove } = mount(id);
        const all = images();
        const fond = all.find(image => image.id === 'fond');
        const chat = all.find(image => image.id === 'chat');
        expect(fond, id).toMatchObject({ frame: `sprite-${themeOf(level).vue}`, visible: true, alpha: 1 });
        expect(chat, id).toMatchObject({ frame: 'sprite-chat-dort', visible: true, alpha: 1 });
        remove();
    }
});

it('un objet masqué est une silhouette pleine, à demi transparente, marquée « ? » ; les autres restent intacts', () => {
    const { level, controller, images, remove } = mount('004-salon');
    const masked = new Set(level.objects.filter(object => object.hidden && !controller.isObjectAccessible(object.id)).map(object => object.id));
    expect(masked.size).toBeGreaterThan(0);
    const objects = images().filter(image => image.id !== 'fond' && image.id !== 'fondu' && image.id !== 'chat');
    expect(objects).toHaveLength(level.objects.length);
    for (const image of objects) {
        const object = level.objects.find(item => item.id === image.id)!;
        expect(image.frame).toBe(`sprite-${object.asset}`);
        expect(image.visible).toBe(true);
        if (masked.has(image.id)) {
            // Oracle écrit ici : une silhouette se voit (au moins 0,5) sans être opaque.
            expect(image, image.id).toMatchObject({ tintMode: Phaser.TintModes.FILL, mark: '?' });
            expect(image.alpha, image.id).toBeGreaterThanOrEqual(.5);
            expect(image.alpha, image.id).toBeLessThan(1);
            expect(SILHOUETTE.tint).toBe(0x8c6a52);
        } else {
            expect(image, image.id).toMatchObject({ tintMode: Phaser.TintModes.MULTIPLY, alpha: 1, mark: null });
        }
    }
    remove();
});

it('le toucher traverse un pixel transparent, privilégie le pixel de devant puis se rabat sur la boîte utile', () => {
    const source = levelById('001-salon')!;
    const [back, front] = source.objects.filter(object => object.blockedBy.length === 0);
    const position = { x: .5, y: .5 };
    const level: Level = { ...source, objects: source.objects.map(object => {
        if (object === back) return { ...object, asset: 'livres-trio', position, layer: 0 };
        if (object === front) return { ...object, asset: 'boite-creme', position, layer: 1 };
        return { ...object, position: { x: .1, y: .1 } };
    }) };
    const { room, scene, controller, remove } = mount(level);
    const alpha = vi.spyOn(scene.textures, 'getPixelAlpha');
    const tap = (clientX: number, clientY: number): void => {
        room.dispatchEvent(new PointerEvent('pointerdown', { clientX, clientY, button: 0, isPrimary: true }));
    };
    const selected = (): readonly string[] => level.objects.filter(object => !controller.state.remainingObjectIds.includes(object.id))
        .map(object => object.id);
    alpha.mockImplementation((x, y, _key, frame) => x === 64 && y === 64 && frame === 'sprite-livres-trio' ? 255 : 0);
    tap(195, 195);
    expect(selected()).toEqual([back!.id]);
    controller.restart();

    alpha.mockReturnValue(255);
    tap(195, 195);
    expect(selected()).toEqual([front!.id]);
    controller.restart();

    alpha.mockReturnValue(0);
    tap(195, 156);
    expect(selected()).toEqual([back!.id]);
    controller.restart();
    // Les deux boîtes s’arrêtent à x = 166. L'égalité à 22 px désigne l'objet de devant.
    tap(144, 195);
    expect(selected()).toEqual([front!.id]);
    controller.restart();
    tap(143.99, 195);
    expect(selected()).toEqual([]);
    remove();
});

type FakeImage = { x: number; y: number; displayWidth: number; displayHeight: number; originX: number; originY: number; depth: number };
type FakeTexture = { paints: { stops: [number, string][]; fill: number[] }[]; refreshed: number; width: number; height: number };
const fadeOf = (scene: object): FakeImage | undefined => (scene as { fade?: FakeImage }).fade;
const backgroundOf = (scene: object): FakeImage => (scene as { background: FakeImage }).background;

it('seule la salle de bain a un fondu, entre la vue et tout le reste de la scène', () => {
    for (const id of ['001-salon', '011-chambre', '015-salle-de-bain', '020-salle-de-bain']) {
        const { images, remove } = mount(id);
        const all = images();
        const fade = all.find(image => image.id === 'fondu');
        if (!id.includes('salle-de-bain')) { expect(fade, id).toBeUndefined(); remove(); continue; }
        const fond = all.find(image => image.id === 'fond')!;
        expect(fade, id).toMatchObject({ visible: true, alpha: 1, flying: false });
        expect(fade!.depth, id).toBeGreaterThan(fond.depth);
        for (const other of all.filter(image => image.id !== 'fond' && image.id !== 'fondu')) {
            expect(other.depth, `${id} ${other.id}`).toBeGreaterThan(fade!.depth);
        }
        remove();
    }
});

it('le fondu couvre les 7 % bas de la vue, sur toute sa largeur', () => {
    const { scene, remove } = mount('015-salle-de-bain');
    const fade = fadeOf(scene)!;
    const view = backgroundOf(scene);
    expect(fade).toMatchObject({ originX: 0, originY: 0 });
    const left = view.x - view.displayWidth / 2;
    const bottom = view.y + view.displayWidth / 2;
    expect(view.displayWidth).toBeGreaterThan(100);
    expect(fade.x).toBeCloseTo(left);
    expect(fade.displayWidth).toBeCloseTo(view.displayWidth);
    expect(fade.displayHeight).toBeCloseTo(view.displayWidth * .07);
    expect(fade.y + fade.displayHeight).toBeCloseTo(bottom);
    remove();
});

it('un objet envoyé vers un carton vole au-dessus du fondu', () => {
    const level = levelById('015-salle-de-bain')!;
    const { scene, controller, images, remove } = mount(level, document.createElement('div'));
    const first = level.objects.find(object => controller.isObjectAccessible(object.id))!;
    scene.tap(first.id);
    const all = images();
    const flying = all.find(image => image.id === first.id && image.flying);
    expect(flying).toBeDefined();
    expect(all.some(image => image.id === first.id && !image.flying)).toBe(false);
    const fade = all.find(image => image.id === 'fondu')!;
    for (const other of all.filter(image => !image.flying)) expect(flying!.depth, other.id).toBeGreaterThan(other.depth);
    expect(flying!.depth).toBeGreaterThan(fade.depth);
    remove();
});

it('le fondu prend la couleur de la page, transparent en haut, et se repeint au changement de thème', async () => {
    const root = document.documentElement;
    root.style.setProperty('--crs-bg', '#FBF1DC');
    const { scene, remove } = mount('015-salle-de-bain');
    const texture = (scene.textures.createCanvas as unknown as { mock: { results: { value: FakeTexture }[] } }).mock.results[0]!.value;
    const last = () => texture.paints.at(-1)!;
    expect(last().stops).toEqual([[0, 'rgba(251, 241, 220, 0)'], [1, 'rgba(251, 241, 220, 1)']]);
    expect(last().fill).toEqual([0, 0, texture.width, texture.height]);
    expect(texture.refreshed).toBe(1);
    root.style.setProperty('--crs-bg', '#2A211D');
    root.dataset['theme'] = 'dark';
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(last().stops).toEqual([[0, 'rgba(42, 33, 29, 0)'], [1, 'rgba(42, 33, 29, 1)']]);
    expect(texture.refreshed).toBe(2);
    root.style.removeProperty('--crs-bg');
    delete root.dataset['theme'];
    remove();
});

it('en Canvas, une silhouette est dessinée sombre par un filtre, puis le contexte retrouve son filtre', () => {
    const level = levelById('004-salon')!;
    const controller = createController(level, 'classique', { save: () => Promise.resolve(), now: () => 0 });
    const room = document.createElement('section');
    room.getBoundingClientRect = () => ({ left: 0, top: 0, x: 0, y: 0, width: 390, height: 390, right: 390, bottom: 390, toJSON: () => ({}) });
    const scene = new RoomScene(room, { controller, targetOf: () => null, bufferSlot: () => null, onReady: () => undefined });
    (scene.game.renderer as { type: number }).type = Phaser.CANVAS;
    scene.create();
    type Drawn = { tintMode: number; filters: string[]; renderCanvas: (renderer: unknown, source: unknown, camera: unknown) => void };
    const sprites = [...(scene as unknown as { sprites: Map<string, Drawn> }).sprites];
    const masked = sprites.filter(([id]) => level.objects.find(object => object.id === id)!.hidden && !controller.isObjectAccessible(id));
    const plain = sprites.filter(([, sprite]) => !masked.some(([, other]) => other === sprite));
    expect(masked.length).toBeGreaterThan(0);
    const restore = vi.fn();
    const context = { filter: 'none', save: () => undefined, restore: () => { context.filter = 'none'; restore(); } };
    for (const [id, sprite] of [...masked, ...plain]) {
        sprite.renderCanvas({ currentContext: context }, sprite, {});
        const filter = sprite.filters.at(-1)!;
        if (masked.some(([other]) => other === id)) {
            // Oracle écrit ici : le filtre éteint d'abord les couleurs (luminosité nulle) avant de recolorer.
            expect(filter, id).toMatch(/^brightness\(0\)\s/);
            expect(filter, id).not.toBe('none');
        } else expect(filter, id).toBe('none');
        expect(context.filter).toBe('none');
    }
    expect(restore).toHaveBeenCalledTimes(masked.length);
});
