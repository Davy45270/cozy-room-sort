// @vitest-environment happy-dom
// Deux onglets sur le même niveau : quand le magasin refuse une écriture (un autre onglet a sauvegardé depuis), l'écran
// recharge la partie sauvegardée et le dit, à l'écran et au lecteur d'écran. Scène et sons remplacés.
import { expect, it, vi } from 'vitest';
import type { AppContext, Route } from '../../../apps/web/src/app-context.ts';
import type { Controller } from '../../../apps/web/src/game/controller.ts';
import { levelById } from '../../../apps/web/src/content.ts';
import { DEFAULT_SETTINGS, type Store } from '../../../apps/web/src/storage/db.ts';

const room = vi.hoisted(() => ({ onReady: undefined as (() => void) | undefined, controller: undefined as Controller | undefined }));
vi.mock('../../../apps/web/src/scene/room-scene.ts', () => ({
    PACK_MS: 180,
    reducedMotion: () => true,
    startRoom: (_stage: HTMLElement, _room: HTMLElement, opts: { onReady: () => void }) => {
        room.onReady = opts.onReady;
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

it('une écriture refusée recharge la partie de l’autre onglet et l’annonce visiblement', async () => {
    const level = levelById('001-salon');
    if (!level) throw new Error('niveau absent');
    const routes: Route[] = [];
    const ctx: AppContext = {
        store: {
            loadSave: () => Promise.resolve({ kind: 'empty', save: undefined }),
            writeSave: () => Promise.resolve({ ok: false }),
            recordResult: () => Promise.resolve()
        } as unknown as Store,
        settings: { ...DEFAULT_SETTINGS, lastLevelId: level.id },
        go: route => { routes.push(route); },
        updateSettings: () => Promise.resolve()
    };
    const screen = await playScreen(ctx, level);
    screen.mounted?.();
    room.onReady?.();
    const first = level.meta?.solution?.[0];
    if (!first) throw new Error('solution absente');
    room.controller?.select(first);
    await room.controller?.idle();
    await Promise.resolve();
    expect(routes).toHaveLength(1);
    const route = routes[0]!;
    expect(route.screen).toBe('play');
    if (route.screen !== 'play') return;
    expect(route.level.id).toBe(level.id);
    screen.dispose?.();

    // L'écran rechargé affiche la raison, hors des zones réservées au lecteur d'écran, et l'annonce.
    const again = await playScreen(ctx, level, route.notice);
    again.mounted?.();
    room.onReady?.();
    const note = again.element.querySelector<HTMLElement>('[data-testid="message-partie"]');
    expect(note?.hidden).toBe(false);
    expect(note?.closest('.sr-only, [hidden], [aria-hidden="true"]')).toBeNull();
    expect(note?.textContent).toMatch(/autre onglet/);
    expect(again.element.querySelector('[role="status"][aria-live="polite"]')?.textContent).toBe(note?.textContent);
    again.dispose?.();
});
