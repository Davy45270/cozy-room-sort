// @vitest-environment happy-dom
// L'indice doit servir au joueur qui n'a que le lecteur d'écran : l'annonce nomme l'objet à jouer, sous le même
// libellé que son bouton dans la liste « Objets à portée ». La scène Phaser et les sons sont remplacés.
import { expect, it, vi } from 'vitest';
import type { AppContext } from '../../../apps/web/src/app-context.ts';
import type { Controller } from '../../../apps/web/src/game/controller.ts';
import { levelById } from '../../../apps/web/src/content.ts';
import { DEFAULT_SETTINGS, type Store } from '../../../apps/web/src/storage/db.ts';

const room = vi.hoisted(() => ({ onReady: undefined as (() => void) | undefined, controller: undefined as Controller | undefined,
    shown: [] as string[] }));

vi.mock('../../../apps/web/src/scene/room-scene.ts', () => ({
    PACK_MS: 180,
    reducedMotion: () => true,
    startRoom: (_stage: HTMLElement, _room: HTMLElement, opts: { onReady: () => void }) => {
        room.onReady = opts.onReady;
        return { game: { destroy: () => undefined }, scene: { showHint: (id: string) => { room.shown.push(id); } } };
    }
}));
// Aucun son, sur aucun appareil.
vi.mock('../../../apps/web/src/sons.ts', () => ({ playSound: () => Promise.resolve() }));
vi.mock('../../../apps/web/src/game/controller.ts', async original => {
    const real = await original<typeof import('../../../apps/web/src/game/controller.ts')>();
    return { ...real, createController: (...args: Parameters<typeof real.createController>) => (room.controller = real.createController(...args)) };
});

const { playScreen } = await import('../../../apps/web/src/screens/play.ts');

it('l’annonce de l’indice nomme l’objet à jouer, comme la liste des objets à portée', async () => {
    const level = levelById('001-salon');
    if (!level) throw new Error('Premier niveau absent');
    const context: AppContext = {
        store: { loadSave: () => Promise.resolve({ kind: 'empty', save: undefined }), writeSave: () => Promise.resolve(),
            recordResult: () => Promise.resolve() } as unknown as Store,
        settings: { ...DEFAULT_SETTINGS, lastLevelId: level.id },
        go: () => undefined,
        updateSettings: () => Promise.resolve()
    };
    const screen = await playScreen(context, level);
    screen.mounted?.();
    room.onReady?.();
    const hint = screen.element.querySelector<HTMLButtonElement>('button[aria-label="Indice"]');
    expect(hint?.hidden).toBe(false);
    hint?.click();
    expect(room.shown).toHaveLength(1);
    const id = room.shown[0];
    const entry = screen.element.querySelector<HTMLButtonElement>(`nav[aria-label="Objets à portée"] button[data-object="${id}"]`);
    expect(entry?.textContent).toBeTruthy();
    const live = screen.element.querySelector('[role="status"][aria-live="polite"]');
    expect(live?.textContent).toContain(entry?.textContent ?? '∅');
    expect(room.controller?.state.hintCount).toBe(1);
    screen.dispose?.();
});
