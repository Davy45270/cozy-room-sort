import type Phaser from 'phaser';
import { starsFor, type GameEvent, type GameState } from '@cozy-room-sort/engine';
import type { Level } from '@cozy-room-sort/schemas';
import type { AppContext, Screen } from '../app-context.ts';
import { levelNumber, nextLevel, themeOf } from '../content.ts';
import { h, iconButton, stars } from '../dom.ts';
import { startClock } from '../game/clock.ts';
import { createController } from '../game/controller.ts';
import { defeatReason } from '../game/defeat.ts';
import { createProgress, renderBoxes, renderBuffer, renderProgress, renderQuotas, renderReachable, renderScore } from '../hud.ts';
import { PACK_MS, reducedMotion, startRoom, type RoomScene } from '../scene/room-scene.ts';
import { playSound } from '../sons.ts';
import { saveLoadAnnouncement } from '../storage/db.ts';
import { BLOCKED_LEVEL, BLOCKED_MOVES, demonstration, installTestHooks } from '../test-hooks.ts';

export async function playScreen(ctx: AppContext, level: Level): Promise<Screen> {
    const demo = demonstration();
    const trace = demo === 'gagner' ? level.meta?.solution : demo === 'bloquer' && level.id === BLOCKED_LEVEL ? BLOCKED_MOVES : undefined;
    const loaded = trace ? undefined : await ctx.store.loadSave(level, ctx.settings.mode);
    const controller = createController(level, trace ? 'classique' : ctx.settings.mode, {
        save: s => trace ? Promise.resolve() : ctx.store.writeSave(s),
        now: () => performance.now()
    }, loaded?.save);
    const announcement = loaded ? saveLoadAnnouncement(loaded) : undefined;
    const rules = controller.level.rules;

    const room = h('section', { class: 'room', 'aria-label': 'Pièce en désordre' });
    const stage = h('div', { class: 'stage', 'aria-hidden': 'true' });
    const boxes = h('div', { class: 'boxes', 'aria-label': 'Cartons', role: 'group' });
    boxes.style.setProperty('--box-columns', String(Math.min(3, level.boxes.length)));
    boxes.style.setProperty('--box-count', String(level.boxes.length));
    const buffer = h('div', { class: 'buffer', role: 'group' });
    const quotas = h('section', { class: 'quotas', 'aria-label': 'Quotas' });
    const score = h('div', { class: 'score' });
    const progress = createProgress(level);
    const reachable = h('ul', { class: 'reachable' });
    const live = h('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
    const overlay = h('div', { class: 'overlay', hidden: true });
    const undo = iconButton('btn-annuler', 'Annuler le dernier coup', () => controller.undo());
    const redo = iconButton('btn-refaire', 'Refaire le dernier coup', () => controller.redo());
    let game: Phaser.Game | undefined;
    let scene: RoomScene | undefined;
    let endTimer: number | undefined;
    let demoTimer: number | undefined;
    let removeHooks: (() => void) | undefined;
    let stopClock: (() => void) | undefined;
    let disposed = false;
    const say = (text: string): void => { live.textContent = text; };
    const hint = iconButton('btn-indice', 'Indice', () => {
        const result = controller.hint();
        if ('objectId' in result) { scene?.showHint(result.objectId); say('Indice. L’objet à toucher est agrandi.'); }
        else say(result.none === 'blocked' ? 'Plus aucun coup possible.' : result.none === 'unavailable' ? 'Plus d’indice pour ce niveau.' : 'Pas d’indice trouvé à temps.');
    });
    hint.hidden = !rules.allowHints;
    undo.hidden = !rules.allowUndo;
    redo.hidden = !rules.allowUndo;

    const theme = themeOf(level);
    const header = h('header', { class: 'topbar' },
        iconButton('btn-accueil', 'Accueil', () => ctx.go({ screen: 'home' })),
        h('div', { class: 'topbar-title' },
            h('span', { class: 'topbar-room', text: `${theme.label} · ${levelNumber(level)}` }), h('h1', { text: level.name })),
        iconButton('btn-reglages', 'Réglages', () => ctx.go({ screen: 'settings', back: { screen: 'play', level } })),
        h('div', { class: 'topbar-actions' }, iconButton('btn-recommencer', 'Recommencer', () => controller.restart()), undo, hint, redo),
        progress);
    const tray = h('aside', { class: 'tray', 'aria-label': 'Cartons et tampon' },
        h('section', { class: 'box-area', 'aria-label': 'Cartons' }, h('h2', { text: 'Cartons' }), boxes), quotas,
        h('div', { class: 'buffer-wrap' }, h('h2', { text: 'Tampon' }), buffer), score);
    const keyboard = h('nav', { class: 'sr-only', 'aria-label': 'Objets à portée' }, h('h2', { text: 'Objets à portée' }), reachable);
    const element = h('main', { class: 'screen play', 'data-testid': 'ecran-jeu', 'data-level': level.id,
        style: `--room-accent: var(--crs-room-${theme.id}, var(--crs-accent))` },
        header, room, stage, tray, keyboard, live, overlay);

    const setModal = (open: boolean): void => {
        overlay.hidden = !open;
        for (const part of [header, room, tray, keyboard]) part.inert = open;
    };
    const showEnd = (state: GameState): void => {
        const next = nextLevel(level);
        const won = state.status === 'won';
        const lost = state.status === 'lost';
        const title = won ? 'Pièce rangée !' : lost ? 'Partie perdue' : 'Le tampon déborde';
        const text = won ? `${state.bufferedCount} passage${state.bufferedCount > 1 ? 's' : ''} au tampon.`
            : lost ? defeatReason(rules, state) : 'Annule un coup ou recommence pour libérer une place.';
        const restart = () => {
            controller.restart();
            header.querySelector<HTMLButtonElement>('[aria-label="Recommencer"]')?.focus();
        };
        const actions = h('div', { class: 'dialog-actions' },
            won && next ? iconButton('btn-jouer', 'Niveau suivant', () => ctx.go({ screen: 'play', level: next }),
                { class: 'icon-button play-button', 'data-action': 'next' }) : null,
            !won && !lost && rules.allowUndo ? iconButton('btn-annuler', 'Annuler', () => { controller.undo(); redo.focus(); },
                { disabled: undo.disabled }) : null,
            iconButton('btn-recommencer', won ? 'Rejouer' : 'Recommencer', restart, { 'data-action': 'replay' }),
            won ? h('button', { type: 'button', class: 'button', onclick: () => ctx.go({ screen: 'levels' }), text: 'Niveaux' }) : null);
        overlay.replaceChildren(h('div', { class: 'dialog', role: won ? 'dialog' : 'alertdialog', 'aria-modal': 'true',
            'aria-labelledby': 'end-title', 'aria-describedby': 'end-message',
            'data-testid': won ? 'ecran-victoire' : lost ? 'ecran-perdu' : 'ecran-bloque' },
        h('h2', { id: 'end-title', text: title }), won ? stars(starsFor(level, state.bufferedCount)) : null,
        h('p', { id: 'end-message', text }), actions));
        setModal(true);
        actions.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    };

    const audioEnabled = (): boolean => !disposed && !trace && ctx.settings.sons;
    const render = (state: GameState, events: readonly GameEvent[]): void => {
        const rejection = events.find(event => event.type === 'ACTION_REJECTED');
        if (rejection) {
            if (rejection.reason === 'buffer-full') say('Le tampon est plein.');
            return;
        }
        window.clearTimeout(endTimer);
        renderBoxes(boxes, level, state);
        renderBuffer(buffer, controller.level, state, levelNumber(level) === 1 && !controller.hasPlayed);
        renderQuotas(quotas, level, state);
        renderProgress(progress, level, state);
        renderScore(score, level, state);
        renderReachable(reachable, controller);
        undo.disabled = state.history.length === 0 || state.undoCount >= (rules.undoLimit ?? Infinity);
        redo.disabled = !controller.canRedo;
        hint.disabled = state.status !== 'playing' || state.hintCount >= (rules.hintLimit ?? Infinity);
        const won = events.find(event => event.type === 'LEVEL_WON');
        if (won && !trace) void ctx.store.recordResult(level.id, { stars: won.stars, bestBuffered: won.bufferedCount });
        const closed = events.some(event => event.type === 'BOX_COMPLETED');
        if (closed) say('Carton plein.');
        const packed = events.some(event => event.type === 'OBJECT_PACKED');
        if (packed || events.some(event => event.type === 'OBJECT_BUFFERED')) {
            void playSound('selection', audioEnabled);
            if (packed) void playSound(won ? 'victoire' : closed ? 'carton-ferme' : 'rangement', audioEnabled);
        }
        if (state.status === 'playing') setModal(false);
        else if (scene && events.some(event => event.type === 'OBJECT_PACKED' || event.type === 'OBJECT_BUFFERED') && !reducedMotion()) {
            endTimer = window.setTimeout(() => showEnd(state), PACK_MS + 20);
        } else showEnd(state);
    };
    const unsubscribe = controller.subscribe(render);
    render(controller.state, []);

    return {
        element,
        mounted: () => {
            if (!trace && ctx.settings.lastLevelId !== level.id) void ctx.updateSettings({ lastLevelId: level.id });
            ({ game, scene } = startRoom(stage, room, {
                controller,
                bufferSlot: index => buffer.querySelector(`[data-buffer-slot="${index}"]`),
                targetOf: event => event.type === 'OBJECT_PACKED'
                    ? boxes.querySelector(`[data-box="${event.boxId}"] .box-picture`)
                    : buffer.querySelector(`[data-buffer-object="${event.objectId}"]`),
                onReady: () => {
                    if (disposed) return;
                    element.dataset['ready'] = 'true';
                    if (announcement) say(announcement);
                    // Niveau chronométré seulement : le temps court dès que la pièce est affichée, pas avant. L'horloge se
                    // suspend à la fin de la partie, reprend après « Recommencer », et s'arrête à la sortie de l'écran.
                    if (!trace) {
                        stopClock = startClock(controller, {
                            now: () => performance.now(),
                            setInterval: (callback, ms) => window.setInterval(callback, ms),
                            clearInterval: handle => { window.clearInterval(handle); }
                        });
                        return;
                    }
                    let index = 0;
                    const playNext = (): void => {
                        const id = trace[index++];
                        if (id === undefined || controller.state.status !== 'playing') return;
                        controller.select(id);
                        if (index < trace.length) demoTimer = window.setTimeout(playNext, 150);
                    };
                    demoTimer = window.setTimeout(playNext, 150);
                }
            }));
            removeHooks = installTestHooks(controller, scene);
        },
        dispose: () => {
            disposed = true;
            stopClock?.();
            window.clearTimeout(demoTimer);
            window.clearTimeout(endTimer);
            unsubscribe();
            removeHooks?.();
            game?.destroy(true);
        }
    };
}
