// Scène de la pièce (Phaser) : le fond, puis les objets dans l'ordre de dessin. Elle ne décide rien : elle montre
// l'état du contrôleur et lui transmet les touchers. Aucun son (le jeu est créé avec audio.noAudio).
import Phaser from 'phaser';
import { objectSvg, silhouetteSvg } from '@cozy-room-sort/art';
import { isAccessible, snapshotOf, type GameEvent, type GameState } from '@cozy-room-sort/engine';
import type { Level } from '@cozy-room-sort/schemas';
import type { Controller } from '../game/controller.ts';
import type { Tone } from '../theme/tokens.ts';
import { drawOrder, layoutRoom, type Placed } from './layout.ts';

const TEXTURE_PX = 256;
const PACK_MS = 180;

const cssColor = (name: string): number => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(`--crs-${name}`).trim() || '#888888';
    return Number.parseInt(value.slice(1), 16);
};

async function addSvgTexture(textures: Phaser.Textures.TextureManager, key: string, svg: string): Promise<void> {
    if (textures.exists(key)) return;
    const img = new Image(TEXTURE_PX, TEXTURE_PX);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await img.decode();
    if (!textures.exists(key)) textures.addImage(key, img);
}

export interface RoomSceneOptions {
    level: Level;
    controller: Controller;
    tone: () => Tone;
    /** Élément DOM vers lequel un objet rangé (ou mis au tampon) s'envole. */
    targetOf: (event: GameEvent) => Element | null;
    onReady?: () => void;
}

export class RoomScene extends Phaser.Scene {
    private readonly opts: RoomSceneOptions;
    private readonly sprites = new Map<string, Phaser.GameObjects.Image>();
    private readonly order: string[];
    private placed = new Map<string, Placed>();
    private background?: Phaser.GameObjects.Graphics;
    private loadedTone: Tone | null = null;
    private unsubscribe?: () => void;
    private hintTween: Phaser.Tweens.Tween | undefined;

    constructor(opts: RoomSceneOptions) {
        super({ key: 'room' });
        this.opts = opts;
        this.order = drawOrder(opts.level);
    }

    create(): void {
        this.background = this.add.graphics();
        this.scale.on('resize', () => this.relayout());
        this.unsubscribe = this.opts.controller.subscribe((state, events) => this.reconcile(state, events));
        this.events.once('shutdown', () => this.unsubscribe?.());
        void this.refreshTheme().then(() => this.opts.onReady?.());
    }

    /** Recharge les textures du mode courant et redessine tout (changement de thème). */
    async refreshTheme(): Promise<void> {
        const tone = this.opts.tone();
        const sticker = tone === 'dark' ? getComputedStyle(document.documentElement).getPropertyValue('--crs-sticker').trim() : undefined;
        const outline = getComputedStyle(document.documentElement).getPropertyValue('--crs-outline').trim() || '#8C6A52';
        await Promise.all(this.opts.level.objects.flatMap(o => [
            addSvgTexture(this.textures, `${o.asset}:${tone}`, objectSvg(o.asset, TEXTURE_PX, sticker)),
            addSvgTexture(this.textures, `sil:${o.asset}:${tone}`, silhouetteSvg(o.asset, outline, TEXTURE_PX))
        ]));
        this.loadedTone = tone;
        for (const sprite of this.sprites.values()) sprite.destroy();
        this.sprites.clear();
        this.relayout();
    }

    private relayout(): void {
        const { width, height } = this.scale.gameSize;
        this.placed = layoutRoom(this.opts.level, { width, height });
        this.drawBackground(width, height);
        this.reconcile(this.opts.controller.state, []);
    }

    private drawBackground(width: number, height: number): void {
        const g = this.background;
        if (!g) return;
        g.clear();
        const floorY = Math.round(height * 0.58);
        g.fillStyle(cssColor('wall')).fillRect(0, 0, width, floorY);
        g.fillStyle(cssColor('floor')).fillRect(0, floorY, width, height - floorY);
        g.fillStyle(cssColor('outline'), 0.35).fillRect(0, floorY - 4, width, 6);
        // Fenêtre et tapis : décor seulement, à l'accent de la pièce.
        const accent = cssColor(`room-${this.opts.level.theme}`);
        const w = Math.min(width * 0.22, 180);
        g.fillStyle(cssColor('surface'), 0.9).fillRoundedRect(width * 0.08, height * 0.08, w, w * 0.8, 10);
        g.lineStyle(4, cssColor('outline'), 0.6).strokeRoundedRect(width * 0.08, height * 0.08, w, w * 0.8, 10);
        g.lineBetween(width * 0.08 + w / 2, height * 0.08, width * 0.08 + w / 2, height * 0.08 + w * 0.8);
        g.fillStyle(accent, 0.18).fillEllipse(width / 2, floorY + (height - floorY) * 0.55, width * 0.8, (height - floorY) * 0.7);
    }

    /** Met les objets d'aplomb avec l'état : créés, retirés (avec envol) ou mis à jour. */
    private reconcile(state: GameState, events: readonly GameEvent[]): void {
        const tone = this.loadedTone;
        if (tone === null) return;
        const level = this.opts.level;
        const remaining = new Set(state.remainingObjectIds);
        const snapshot = snapshotOf(state);
        for (const [id, sprite] of [...this.sprites]) {
            if (remaining.has(id)) continue;
            this.sprites.delete(id);
            const leaving = events.find(e => (e.type === 'OBJECT_PACKED' || e.type === 'OBJECT_BUFFERED') && e.objectId === id);
            this.flyAway(sprite, leaving ? this.opts.targetOf(leaving) : null);
        }
        this.order.forEach((id, depth) => {
            if (!remaining.has(id)) return;
            const object = level.objects.find(o => o.id === id);
            const at = this.placed.get(id);
            if (!object || !at) return;
            const accessible = isAccessible(level, snapshot, id);
            const key = object.hidden === true && !accessible ? `sil:${object.asset}:${tone}` : `${object.asset}:${tone}`;
            let sprite = this.sprites.get(id);
            if (!sprite) {
                sprite = this.add.image(at.x, at.y, key).setDepth(depth + 1).setInteractive({ useHandCursor: true });
                sprite.on('pointerdown', () => this.tap(id));
                sprite.setAlpha(0);
                this.tweens.add({ targets: sprite, alpha: 1, duration: 140 });
                this.sprites.set(id, sprite);
            } else if (sprite.texture.key !== key) sprite.setTexture(key);
            sprite.setPosition(at.x, at.y).setDisplaySize(at.size, at.size);
            sprite.setData('accessible', accessible);
            if (accessible) sprite.clearTint(); else sprite.setTint(tone === 'dark' ? 0x9a8a7c : 0xc9b9a6);
        });
    }

    /** Toucher d'un objet : même chemin pour le pointeur et pour les tests. */
    tap(id: string): void {
        const sprite = this.sprites.get(id);
        if (!sprite) return;
        if (sprite.getData('accessible') !== true) {
            this.tweens.add({ targets: sprite, x: sprite.x + 5, duration: 50, yoyo: true, repeat: 1 });
            return;
        }
        this.clearHint();
        this.opts.controller.select(id);
    }

    private flyAway(sprite: Phaser.GameObjects.Image, target: Element | null): void {
        sprite.disableInteractive();
        sprite.setDepth(10_000);
        const canvas = this.game.canvas.getBoundingClientRect();
        const rect = target?.getBoundingClientRect();
        const to = rect ? { x: rect.left + rect.width / 2 - canvas.left, y: rect.top + rect.height / 2 - canvas.top } : { x: sprite.x, y: sprite.y };
        this.tweens.add({
            targets: sprite, x: to.x, y: to.y, scale: sprite.scale * 0.35, alpha: 0, duration: PACK_MS, ease: 'Quad.easeIn',
            onComplete: () => sprite.destroy()
        });
    }

    showHint(id: string): void {
        this.clearHint();
        const sprite = this.sprites.get(id);
        if (!sprite) return;
        const base = sprite.scale;
        this.hintTween = this.tweens.add({ targets: sprite, scale: base * 1.15, duration: 320, yoyo: true, repeat: 3, onStop: () => sprite.setScale(base), onComplete: () => sprite.setScale(base) });
    }

    private clearHint(): void {
        this.hintTween?.stop();
        this.hintTween = undefined;
    }

    /** Centre d'un objet en coordonnées de page (tests de bout en bout). */
    objectCenter(id: string): { x: number; y: number } | null {
        const at = this.placed.get(id);
        if (!at || !this.sprites.has(id)) return null;
        const canvas = this.game.canvas.getBoundingClientRect();
        return { x: canvas.left + at.x, y: canvas.top + at.y };
    }
}

export function startRoom(parent: HTMLElement, opts: RoomSceneOptions): { game: Phaser.Game; scene: RoomScene } {
    const scene = new RoomScene(opts);
    const game = new Phaser.Game({
        type: Phaser.AUTO, parent, transparent: true,
        width: Math.max(1, parent.clientWidth), height: Math.max(1, parent.clientHeight),
        scale: { mode: Phaser.Scale.RESIZE },
        // Repris d'oc-busfolie : une seule texture par lot WebGL, sinon Phaser 4.2.1 perd des morceaux de sprites.
        render: { antialias: true, maxTextures: 1 },
        audio: { noAudio: true },
        banner: false,
        scene: [scene]
    });
    return { game, scene };
}
