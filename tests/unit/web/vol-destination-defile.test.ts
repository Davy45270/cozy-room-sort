// @vitest-environment happy-dom
// Paysage court : le panneau de droite défile. La destination d'un vol (carton ou case du tampon) est d'abord amenée
// dans la partie visible du panneau, au plus court, puis rendue à la scène qui y fait atterrir le vol.
// La scène Phaser et les sons sont remplacés.
import { afterEach, expect, it, vi } from 'vitest';
import type { GameEvent } from '@cozy-room-sort/engine';
import type { AppContext } from '../../../apps/web/src/app-context.ts';
import type { Controller } from '../../../apps/web/src/game/controller.ts';
import { levelById } from '../../../apps/web/src/content.ts';
import { DEFAULT_SETTINGS, type Store } from '../../../apps/web/src/storage/db.ts';

type MoveEvent = Extract<GameEvent, { type: 'OBJECT_PACKED' | 'OBJECT_BUFFERED' }>;
const room = vi.hoisted(() => ({ targetOf: undefined as ((event: MoveEvent) => Element | null) | undefined,
    controller: undefined as Controller | undefined }));

vi.mock('../../../apps/web/src/scene/room-scene.ts', () => ({
    PACK_MS: 180,
    reducedMotion: () => true,
    startRoom: (_stage: HTMLElement, _room: HTMLElement, opts: { targetOf: (event: MoveEvent) => Element | null }) => {
        room.targetOf = opts.targetOf;
        return { game: { destroy: () => undefined }, scene: { showHint: () => undefined } };
    }
}));
// Aucun son, sur aucun appareil.
vi.mock('../../../apps/web/src/sons.ts', () => ({ playSound: () => Promise.resolve() }));
vi.mock('../../../apps/web/src/game/controller.ts', async original => {
    const real = await original<typeof import('../../../apps/web/src/game/controller.ts')>();
    return { ...real, createController: (...args: Parameters<typeof real.createController>) => (room.controller = real.createController(...args)) };
});

const { playScreen } = await import('../../../apps/web/src/screens/play.ts');

afterEach(() => { vi.restoreAllMocks(); });

async function open(id: string) {
    const level = levelById(id);
    if (!level) throw new Error(`niveau ${id} absent`);
    const context: AppContext = {
        store: { loadSave: () => Promise.resolve({ kind: 'empty', save: undefined }), writeSave: () => Promise.resolve({ ok: true, revision: 1 }),
            recordResult: () => Promise.resolve() } as unknown as Store,
        settings: { ...DEFAULT_SETTINGS, mode: 'classique', lastLevelId: level.id },
        go: () => undefined,
        updateSettings: () => Promise.resolve()
    };
    const screen = await playScreen(context, level);
    screen.mounted?.();
    return { level, screen };
}

/** Éléments défilés, dans l'ordre, avec leurs options. */
function watchScroll(): { element: Element; options: unknown }[] {
    const calls: { element: Element; options: unknown }[] = [];
    vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(function (this: Element, options?: unknown) { calls.push({ element: this, options }); });
    return calls;
}

it('un objet rangé : l’image de son carton défile au plus court, puis devient la destination du vol', async () => {
    const { level, screen } = await open('001-salon');
    const calls = watchScroll();
    const box = level.boxes[0]!;
    const target = room.targetOf!({ type: 'OBJECT_PACKED', objectId: level.objects[0]!.id, boxId: box.id, fromBuffer: false });
    const picture = screen.element.querySelector(`[data-box="${box.id}"] .box-picture`);
    expect(picture).not.toBeNull();
    expect(target).toBe(picture);
    expect(calls).toEqual([{ element: picture, options: { block: 'nearest', inline: 'nearest' } }]);
    screen.dispose?.();
});

it('un objet posé au tampon : sa case défile au plus court, puis devient la destination du vol', async () => {
    const { level, screen } = await open('001-salon');
    const controller = room.controller!;
    // Le premier objet accessible qui part au tampon : sa catégorie n'a aucun carton ouvert.
    const actives = new Set(level.boxes.slice(0, level.rules.activeBoxCount).map(box => box.category));
    for (const object of level.objects) {
        if (controller.state.bufferObjectIds.length > 0) break;
        if (!actives.has(object.category) && controller.isObjectAccessible(object.id)) controller.select(object.id);
    }
    const id = controller.state.bufferObjectIds[0];
    expect(id).toBeDefined();
    const calls = watchScroll();
    const target = room.targetOf!({ type: 'OBJECT_BUFFERED', objectId: id! });
    const slot = screen.element.querySelector(`[data-buffer-object="${id!}"]`);
    expect(slot).not.toBeNull();
    expect(target).toBe(slot);
    expect(calls).toEqual([{ element: slot, options: { block: 'nearest', inline: 'nearest' } }]);
    screen.dispose?.();
});
