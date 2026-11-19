// @vitest-environment happy-dom
// La scène tourne sur un Phaser d'essai qui enregistre ce que la scène demande à ses images ; le crochet de test
// `images()` rend ensuite cet état (cadre, visibilité, opacité, mode de teinte, marque « ? »).
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
        x = 0; y = 0; scale = 1; depth = 0;
        input?: { hitArea: Rectangle; enabled: boolean };
        frame: { name: string };
        constructor(frame: string) { this.frame = { name: frame }; }
        setDepth(depth: number): this { this.depth = depth; return this; }
        setPosition(x: number, y: number): this { this.x = x; this.y = y; return this; }
        setDisplaySize(): this { return this; }
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
    const rect = (): DOMRect => ({ left: 0, top: 0, x: 0, y: 0, width: 390, height: 390, right: 390, bottom: 390, toJSON: () => ({}) });
    class Scene {
        add = { image: (_x: number, _y: number, _key: string, frame: string) => new Image(frame), text: (_x: number, _y: number, text: string) => new Text(text) };
        load = { atlas: () => undefined };
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

function mount(id: string) {
    const level = levelById(id);
    if (!level) throw new Error(id);
    const controller = createController(level, 'classique', { save: () => Promise.resolve(), now: () => 0 });
    const room = document.createElement('section');
    room.getBoundingClientRect = () => ({ left: 0, top: 0, x: 0, y: 0, width: 390, height: 390, right: 390, bottom: 390, toJSON: () => ({}) });
    const scene = new RoomScene(room, { controller, targetOf: () => null, bufferSlot: () => null, onReady: () => undefined });
    scene.create();
    window.history.replaceState(null, '', '/?test=1');
    const remove = installTestHooks(controller, scene);
    const images = () => window.__cozy!.images();
    return { level, controller, images, remove };
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
    const objects = images().filter(image => image.id !== 'fond' && image.id !== 'chat');
    expect(objects).toHaveLength(level.objects.length);
    for (const image of objects) {
        const object = level.objects.find(item => item.id === image.id)!;
        expect(image.frame).toBe(`sprite-${object.asset}`);
        expect(image.visible).toBe(true);
        if (masked.has(image.id)) {
            expect(image, image.id).toMatchObject({ tintMode: Phaser.TintModes.FILL, alpha: SILHOUETTE.alpha, mark: '?' });
            expect(SILHOUETTE.alpha).toBeLessThan(1);
        } else {
            expect(image, image.id).toMatchObject({ tintMode: Phaser.TintModes.MULTIPLY, alpha: 1, mark: null });
        }
    }
    remove();
});
