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
        store: { loadSave: () => Promise.resolve({ kind: 'empty', save: undefined }), writeSave: () => Promise.resolve({ ok: true, revision: 1 }),
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

it('impasse encore jouable : l’indice le dit à l’écran et au lecteur d’écran, sans parler de délai', async () => {
    const level = levelById('004-salon');
    if (!level) throw new Error('niveau absent');
    room.shown = [];
    const context: AppContext = {
        store: { loadSave: () => Promise.resolve({ kind: 'empty', save: undefined }), writeSave: () => Promise.resolve({ ok: true, revision: 1 }),
            recordResult: () => Promise.resolve() } as unknown as Store,
        settings: { ...DEFAULT_SETTINGS, mode: 'classique', lastLevelId: level.id },
        go: () => undefined,
        updateSettings: () => Promise.resolve()
    };
    const screen = await playScreen(context, level);
    screen.mounted?.();
    room.onReady?.();
    for (const id of ['pile-11', 'pile-15', 'pile-2']) room.controller?.select(id);
    expect(room.controller?.state.status).toBe('playing');
    screen.element.querySelector<HTMLButtonElement>('button[aria-label="Indice"]')?.click();
    expect(room.shown).toEqual([]);
    const live = screen.element.querySelector('[role="status"][aria-live="polite"]')?.textContent ?? '';
    expect(live).toMatch(/annule|recommence/i);
    expect(live).not.toMatch(/temps/);
    // Message visible : hors des zones réservées au lecteur d'écran, et pas masqué.
    const note = screen.element.querySelector<HTMLElement>('[data-testid="message-indice"]');
    expect(note?.hidden).toBe(false);
    expect(note?.closest('.sr-only, [hidden], [aria-hidden="true"]')).toBeNull();
    expect(note?.textContent).toBe(live);
    screen.dispose?.();
});
