import Phaser from 'phaser';
import type { GameEvent, GameState } from '@cozy-room-sort/engine';
import { spriteOf } from '../atlas.ts';
import { themeOf } from '../content.ts';
import type { Controller } from '../game/controller.ts';
import { drawOrder, layoutRoom, MIN_SIZE, roomView, type Placed } from './layout.ts';

type MoveEvent = Extract<GameEvent, { type: 'OBJECT_PACKED' | 'OBJECT_BUFFERED' }>;
export const PACK_MS = 180;
export const reducedMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface RoomSceneOptions {
    controller: Controller;
    targetOf: (event: MoveEvent) => Element | null;
    bufferSlot: (index: number) => Element | null;
    onReady: () => void;
}

export class RoomScene extends Phaser.Scene {
    private readonly opts: RoomSceneOptions;
    private readonly room: HTMLElement;
    private readonly sprites = new Map<string, Phaser.GameObjects.Image>();
    private readonly flights = new Map<string, Phaser.GameObjects.Image>();
    private readonly order: string[];
    private placed = new Map<string, Placed>();
    private background?: Phaser.GameObjects.Image;
    private cat?: Phaser.GameObjects.Image;
    private previous?: GameState;
    private hintTween: Phaser.Tweens.Tween | undefined;
    private hintSprite: Phaser.GameObjects.Image | undefined;

    constructor(room: HTMLElement, opts: RoomSceneOptions) {
        super({ key: 'room' });
        this.room = room;
        this.opts = opts;
        this.order = drawOrder(opts.controller.level);
    }

    preload(): void {
        const { level } = this.opts.controller;
        const { vue } = themeOf(level);
        const atlases = new Set([vue, 'chat-dort', ...level.objects.map(object => object.asset)].map(asset => spriteOf(asset).atlas));
        for (const atlas of atlases) this.load.atlas(atlas.key, atlas.image, atlas.json);
    }

    private image(asset: string, x = 0, y = 0): Phaser.GameObjects.Image {
        const { atlas, key } = spriteOf(asset);
        return this.add.image(x, y, atlas.key, key);
    }

    create(): void {
        this.background = this.image(themeOf(this.opts.controller.level).vue);
        this.cat = this.image('chat-dort').setDepth(1);
        const relayout = (): void => this.relayout();
        this.scale.on('resize', relayout);
        const cancelSyntheticClick = (event: TouchEvent): void => event.preventDefault();
        this.room.addEventListener('touchstart', cancelSyntheticClick, { passive: false });
        const unsubscribe = this.opts.controller.subscribe((state, events) => this.reconcile(state, events));
        this.events.once('shutdown', () => {
            unsubscribe();
            this.scale.off('resize', relayout);
            this.room.removeEventListener('touchstart', cancelSyntheticClick);
        });
        this.scale.refresh();
        this.relayout();
        this.game.events.once('postrender', this.opts.onReady);
    }

    private relayout(): void {
        this.clearHint();
        const canvas = this.game.canvas;
        const canvasRect = canvas.getBoundingClientRect();
        const room = this.room.getBoundingClientRect();
        const left = room.left - canvasRect.left;
        const top = room.top - canvasRect.top;
        const view = roomView(room);
        this.background?.setPosition(left + view.x, top + view.y).setDisplaySize(view.size, view.size);
        this.cat?.setPosition(left + view.x + view.size * 0.15, top + view.y + view.size * 0.33)
            .setDisplaySize(view.size * 0.17, view.size * 0.17);
        this.placed = layoutRoom(this.opts.controller.level, room);
        for (const at of this.placed.values()) { at.x += left; at.y += top; }
        this.reconcile(this.opts.controller.state, []);
    }

    private reconcile(state: GameState, events: readonly GameEvent[]): void {
        const level = this.opts.controller.level;
        const remaining = new Set(state.remainingObjectIds);
        if (this.previous && state.moveCount < this.previous.moveCount) {
            for (const sprite of this.flights.values()) { this.tweens.killTweensOf(sprite); sprite.destroy(); }
            this.flights.clear();
        }
        for (const [id, sprite] of this.sprites) {
            if (remaining.has(id)) continue;
            this.sprites.delete(id);
            if (sprite === this.hintSprite) this.clearHint();
            const move = events.find((event): event is MoveEvent =>
                (event.type === 'OBJECT_PACKED' || event.type === 'OBJECT_BUFFERED') && event.objectId === id);
            this.flyAway(id, sprite, move ? this.opts.targetOf(move) : null);
        }
        if (this.previous && !reducedMotion()) {
            for (const event of events) {
                if (event.type !== 'OBJECT_PACKED' || !event.fromBuffer) continue;
                const target = this.opts.targetOf(event);
                const flying = this.flights.get(event.objectId);
                if (flying) {
                    this.tweens.killTweensOf(flying);
                    this.flyAway(event.objectId, flying, target);
                    continue;
                }
                const slot = this.opts.bufferSlot(this.previous.bufferObjectIds.indexOf(event.objectId));
                const object = level.objects.find(item => item.id === event.objectId);
                if (!slot || !object) continue;
                const start = this.center(slot);
                const size = Math.min(MIN_SIZE, slot.getBoundingClientRect().width);
                this.flyAway(object.id, this.image(object.asset, start.x, start.y).setDisplaySize(size, size), target);
            }
        }
        this.previous = state;
        this.order.forEach((id, depth) => {
            if (!remaining.has(id)) return;
            const object = level.objects.find(item => item.id === id);
            const at = this.placed.get(id);
            if (!object || !at) return;
            const accessible = this.opts.controller.isObjectAccessible(id);
            let sprite = this.sprites.get(id);
            const { hitbox, frame } = spriteOf(object.asset);
            if (!sprite) {
                const area = new Phaser.Geom.Rectangle(0, 0, frame.w, frame.h);
                sprite = this.image(object.asset).setDepth(depth + 2)
                    .setInteractive({ hitArea: area, hitAreaCallback: (bounds: Phaser.Geom.Rectangle, x: number, y: number) => bounds.contains(x, y), useHandCursor: true });
                sprite.on('pointerdown', () => this.tap(id));
                if (this.game.renderer.type === Phaser.CANVAS) this.tintCanvasImage(sprite);
                this.sprites.set(id, sprite);
            }
            sprite.setPosition(at.x, at.y);
            if (sprite !== this.hintSprite) sprite.setDisplaySize(at.size, at.size);
            if (sprite.input) {
                const area = sprite.input.hitArea as Phaser.Geom.Rectangle;
                const w = Math.min(frame.w, Math.max(hitbox.w, MIN_SIZE * frame.w / at.size));
                const h = Math.min(frame.h, Math.max(hitbox.h, MIN_SIZE * frame.h / at.size));
                area.setTo(
                    Phaser.Math.Clamp(hitbox.x + (hitbox.w - w) / 2, 0, frame.w - w),
                    Phaser.Math.Clamp(hitbox.y + (hitbox.h - h) / 2, 0, frame.h - h), w, h
                );
                sprite.input.enabled = accessible;
            }
            if (object.hidden && !accessible) sprite.setTint(0x3b2a22).setTintMode(Phaser.TintModes.FILL);
            else sprite.setTintMode(Phaser.TintModes.MULTIPLY).clearTint();
        });
    }

    private tintCanvasImage(sprite: Phaser.GameObjects.Image): void {
        type RenderCanvas = (renderer: Phaser.Renderer.Canvas.CanvasRenderer, image: Phaser.GameObjects.Image,
            camera: Phaser.Cameras.Scene2D.Camera, matrix?: Phaser.GameObjects.Components.TransformMatrix) => void;
        const image = sprite as Phaser.GameObjects.Image & { renderCanvas: RenderCanvas };
        const render = image.renderCanvas;
        image.renderCanvas = (renderer, source, camera, matrix) => {
            if (source.tintMode !== Phaser.TintModes.FILL) { render(renderer, source, camera, matrix); return; }
            const context = renderer.currentContext;
            context.save();
            context.filter = 'brightness(0)';
            render(renderer, source, camera, matrix);
            context.restore();
        };
    }

    tap(id: string): void {
        if (!this.sprites.has(id) || !this.opts.controller.isObjectAccessible(id) || this.opts.controller.state.status !== 'playing') return;
        this.clearHint();
        this.opts.controller.select(id);
    }

    private center(target: Element): { x: number; y: number } {
        const canvas = this.game.canvas.getBoundingClientRect();
        const rect = target.getBoundingClientRect();
        return { x: rect.left + rect.width / 2 - canvas.left, y: rect.top + rect.height / 2 - canvas.top };
    }

    private flyAway(id: string, sprite: Phaser.GameObjects.Image, target: Element | null): void {
        if (!target || reducedMotion()) {
            this.flights.delete(id);
            sprite.destroy();
            return;
        }
        const destination = this.center(target);
        sprite.disableInteractive().setDepth(10_000);
        this.flights.set(id, sprite);
        this.tweens.add({
            targets: sprite, ...destination, scale: sprite.scale * 0.42, duration: PACK_MS, ease: 'Quad.easeOut',
            onComplete: () => { this.flights.delete(id); sprite.destroy(); }
        });
    }

    showHint(id: string): void {
        this.clearHint();
        const sprite = this.sprites.get(id);
        if (!sprite) return;
        this.hintSprite = sprite;
        if (reducedMotion()) { sprite.setScale(sprite.scale * 1.18); return; }
        this.hintTween = this.tweens.add({ targets: sprite, scale: sprite.scale * 1.18, duration: 250, yoyo: true, repeat: 2,
            onComplete: () => { this.hintSprite = undefined; this.hintTween = undefined; } });
    }

    private clearHint(): void {
        this.hintTween?.stop();
        this.hintTween = undefined;
        if (!this.hintSprite) return;
        const at = [...this.placed].find(([id]) => this.sprites.get(id) === this.hintSprite)?.[1];
        if (at) this.hintSprite.setDisplaySize(at.size, at.size);
        this.hintSprite = undefined;
    }

    objectCenter(id: string): { x: number; y: number } | null {
        const sprite = this.sprites.get(id);
        if (!sprite) return null;
        const canvas = this.game.canvas.getBoundingClientRect();
        const area = sprite.input?.hitArea as Phaser.Geom.Rectangle | undefined;
        return {
            x: canvas.left + sprite.x + ((area?.centerX ?? sprite.displayOriginX) - sprite.displayOriginX) * sprite.scaleX,
            y: canvas.top + sprite.y + ((area?.centerY ?? sprite.displayOriginY) - sprite.displayOriginY) * sprite.scaleY
        };
    }
}

export function startRoom(parent: HTMLElement, room: HTMLElement, opts: RoomSceneOptions): { game: Phaser.Game; scene: RoomScene } {
    const scene = new RoomScene(room, opts);
    const game = new Phaser.Game({
        type: Phaser.AUTO, parent, transparent: true,
        width: Math.max(1, parent.clientWidth), height: Math.max(1, parent.clientHeight),
        scale: { mode: Phaser.Scale.RESIZE },
        input: { mouse: { target: room, preventDefaultWheel: false }, touch: { target: room }, windowEvents: false },
        render: { antialias: true, maxTextures: 1 },
        audio: { noAudio: true },
        banner: false,
        scene: [scene]
    });
    // Le canevas couvre le HUD pour les envols. La région interactive conserve ses propres dimensions.
    const observer = new ResizeObserver(() => { game.scale.getParentBounds(); game.scale.refresh(); });
    observer.observe(parent);
    observer.observe(room);
    // Sur une page visible, relance la boucle si aucune image ne vient de la fenêtre.
    let lastFrame = -1;
    const watchdog = window.setInterval(() => {
        if (game.isRunning && document.visibilityState === 'visible' && game.loop.frame === lastFrame) game.loop.step(performance.now());
        lastFrame = game.loop.frame;
    }, 100);
    game.events.once('destroy', () => window.clearInterval(watchdog));
    game.events.once('destroy', () => observer.disconnect());
    return { game, scene };
}
