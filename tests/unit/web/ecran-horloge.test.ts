// @vitest-environment happy-dom
// Branchement de l'horloge sur l'écran de jeu : démarrage quand la pièce est prête, reprise après « Recommencer »,
// arrêt à la sortie de l'écran. La scène Phaser et les sons sont remplacés ; contrôleur, moteur et horloge sont réels.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Level } from '@cozy-room-sort/schemas';
import type { AppContext } from '../../../apps/web/src/app-context.ts';
import type { Controller } from '../../../apps/web/src/game/controller.ts';
import { levelById } from '../../../apps/web/src/content.ts';
import { DEFAULT_SETTINGS, type Store } from '../../../apps/web/src/storage/db.ts';
import { makeLevel } from '../engine/levels.ts';

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

const timed = (seconds: number): Level => {
    const level = levelById('001-salon');
    if (!level) throw new Error('Premier niveau absent');
    return { ...level, rules: { ...level.rules, timeLimitSeconds: seconds } };
};
const context = (level: Level): AppContext => ({
    store: {
        loadSave: () => Promise.resolve({ kind: 'empty', save: undefined }),
        writeSave: () => Promise.resolve({ ok: true, revision: 1 }),
        recordResult: () => Promise.resolve()
    } as unknown as Store,
    settings: { ...DEFAULT_SETTINGS, lastLevelId: level.id },
    go: () => undefined,
    updateSettings: () => Promise.resolve()
});
const controller = (): Controller => {
    if (!room.controller) throw new Error('Contrôleur non créé');
    return room.controller;
};

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'performance'] });
    room.onReady = undefined;
    room.controller = undefined;
});
afterEach(() => { vi.useRealTimers(); });

it('l’horloge part quand la pièce est prête, pas au montage de l’écran', async () => {
    const level = timed(3);
    const screen = await playScreen(context(level), level);
    screen.mounted?.();
    vi.advanceTimersByTime(5000);
    expect(controller().state.elapsedMs).toBe(0);
    expect(controller().state.status).toBe('playing');
    room.onReady?.();
    vi.advanceTimersByTime(1000);
    expect(controller().state.elapsedMs).toBe(1000);
    screen.dispose?.();
});

it('échéance, « Recommencer », puis le temps court de nouveau jusqu’à la défaite', async () => {
    const level = timed(2);
    const screen = await playScreen(context(level), level);
    screen.mounted?.();
    room.onReady?.();
    vi.advanceTimersByTime(2000);
    expect(controller().state.status).toBe('lost');
    expect(screen.element.querySelector('#end-message')?.textContent).toBe('Le temps est écoulé.');
    const replay = screen.element.querySelector<HTMLButtonElement>('[data-testid="ecran-perdu"] [data-action="replay"]');
    expect(replay).not.toBeNull();
    vi.advanceTimersByTime(10_000);
    replay?.click();
    expect(controller().state.status).toBe('playing');
    expect(controller().state.elapsedMs).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(controller().state.elapsedMs).toBe(1000);
    vi.advanceTimersByTime(1000);
    expect(controller().state.status).toBe('lost');
    screen.dispose?.();
});

it('à la sortie de l’écran, l’horloge est détruite : plus aucune minuterie, plus aucun temps ajouté', async () => {
    const level = timed(60);
    const screen = await playScreen(context(level), level);
    screen.mounted?.();
    room.onReady?.();
    vi.advanceTimersByTime(1000);
    expect(controller().state.elapsedMs).toBe(1000);
    screen.dispose?.();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(5000);
    expect(controller().state.elapsedMs).toBe(1000);
});

// Motif de défaite par cause, à l'écran (relecture : « en mode expert » était dit pour toute défaite).
// Après b1, plus aucun coup légal ; tampon d'une place.
// Catégories réelles du salon (l'écran affiche leurs icônes) ; identifiant du premier niveau.
const impasse = (): Level => ({ ...makeLevel({ boxes: [['plantes', 2], ['cadres', 2]],
    objects: [['b1', 'cadres'], ['b2', 'cadres', ['b1']], ['a1', 'plantes', ['b2']], ['a2', 'plantes', ['a1']]], rules: { bufferCapacity: 1 } }), id: '001-salon' });
const ASSETS: Record<string, string> = { b1: 'cadre-feuille', b2: 'cadre-collines', a1: 'tournesols', a2: 'bouquet-blanc' };
const impasseAvecCadres = (): Level => { const l = impasse(); return { ...l, objects: l.objects.map(o => ({ ...o, asset: ASSETS[o.id] ?? o.asset })) }; };
const message = (screen: { element: HTMLElement }): string | null | undefined =>
    screen.element.querySelector('[data-testid="ecran-perdu"] #end-message')?.textContent;

it('classique, annulations épuisées : la défaite le dit, sans parler du mode expert', async () => {
    const level = impasseAvecCadres();
    const screen = await playScreen({ ...context(level), settings: { ...DEFAULT_SETTINGS, mode: 'classique', lastLevelId: level.id } }, level);
    screen.mounted?.();
    room.onReady?.();
    for (let i = 0; i < 3; i++) { controller().select('b1'); expect(controller().state.status).toBe('blocked'); controller().undo(); }
    controller().select('b1');
    expect(controller().state.status).toBe('lost');
    expect(message(screen)).toBe('Il ne reste aucun coup possible, et toutes tes annulations sont utilisées.');
    screen.dispose?.();
});

it('expert : la défaite dit que ce mode ne permet pas d’annuler', async () => {
    const level = impasseAvecCadres();
    const screen = await playScreen({ ...context(level), settings: { ...DEFAULT_SETTINGS, mode: 'expert', lastLevelId: level.id } }, level);
    screen.mounted?.();
    room.onReady?.();
    controller().select('b1');
    expect(controller().state.status).toBe('lost');
    expect(message(screen)).toBe('Il ne reste aucun coup possible, et ce mode ne permet pas d’annuler.');
    screen.dispose?.();
});

// R-008 : le coup gagnant s'annule aussi depuis le dialogue de victoire (la barre est inerte sous le dialogue).
it('détente : le dialogue de victoire offre « Annuler », qui remet le dernier objet dans la pièce et ferme le dialogue', async () => {
    const base = impasseAvecCadres();
    const level: Level = { ...base, rules: { ...base.rules, bufferCapacity: 3 } };
    const screen = await playScreen({ ...context(level), settings: { ...DEFAULT_SETTINGS, mode: 'detente', lastLevelId: level.id } }, level);
    screen.mounted?.();
    room.onReady?.();
    for (const id of ['b1', 'b2', 'a1', 'a2']) controller().select(id);
    expect(controller().state.status).toBe('won');
    const annuler = screen.element.querySelector<HTMLButtonElement>('[data-testid="ecran-victoire"] [data-action="undo"]');
    expect(annuler).not.toBeNull();
    expect(annuler?.disabled).toBe(false);
    annuler?.click();
    expect(controller().state.status).toBe('playing');
    expect(controller().state.remainingObjectIds).toEqual(['a2']);
    expect(screen.element.querySelector<HTMLElement>('[data-testid="ecran-victoire"]')?.closest('[hidden]')).not.toBeNull();
    screen.dispose?.();
});
