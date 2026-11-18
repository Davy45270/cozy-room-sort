import type Phaser from 'phaser';
import type { GameEvent, GameState } from '@cozy-room-sort/engine';
import type { Level } from '@cozy-room-sort/schemas';
import type { AppContext, Screen } from '../app-context.ts';
import { levelNumber, nextLevel, THEMES } from '../content.ts';
import { h, iconButton, stars } from '../dom.ts';
import { createController, type Controller } from '../game/controller.ts';
import { renderBoxes, renderBuffer, renderReachable, renderScore } from '../hud.ts';
import { startRoom, type RoomScene } from '../scene/room-scene.ts';
import { installTestHooks } from '../test-hooks.ts';

export async function playScreen(ctx: AppContext, level: Level): Promise<Screen> {
    const saved = await ctx.store.readSave(level.id, level.rulesVersion);
    const controller: Controller = createController(level, ctx.settings.mode, {
        save: s => ctx.store.writeSave(s),
        now: () => performance.now()
    }, saved ?? undefined);
    const rules = controller.level.rules;
    if (ctx.settings.lastLevelId !== level.id) void ctx.updateSettings({ lastLevelId: level.id });

    const room = h('section', { class: 'room', 'aria-label': 'Pièce en désordre' });
    const boxes = h('div', { class: 'boxes', 'aria-label': 'Cartons ouverts' });
    const buffer = h('div', { class: 'buffer', role: 'group' });
    const score = h('div', { class: 'score' });
    const reachable = h('ul', { class: 'reachable' });
    const live = h('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
    const dialog = h('div', { class: 'overlay', hidden: true });
    const undoButton = iconButton('undo', 'Annuler le dernier coup', () => controller.undo());
    const hintButton = iconButton('hint', 'Indice', () => {
        const result = controller.hint();
        if ('objectId' in result) { scene?.showHint(result.objectId); say('Indice : l\'objet qui grossit.'); }
        else say(result.none === 'blocked' ? 'Plus aucun coup possible.' : result.none === 'unavailable' ? 'Plus d\'indice pour ce niveau.' : 'Pas d\'indice trouvé à temps.');
    });
    hintButton.hidden = !rules.allowHints;
    undoButton.hidden = !rules.allowUndo;
    const badge = (button: HTMLElement, left: number | null): void => {
        button.querySelector('.badge')?.remove();
        if (left !== null) button.append(h('span', { class: 'badge', 'aria-hidden': 'true', text: String(left) }));
    };

    const theme = THEMES[level.theme];
    const element = h('main', { class: `screen play room-${level.theme}`, 'data-level': level.id },
        h('header', { class: 'topbar' },
            iconButton('home', 'Accueil', () => ctx.go({ screen: 'home' })),
            h('div', { class: 'topbar-title' }, h('span', { class: 'topbar-room', text: `${theme?.label ?? level.theme} · ${levelNumber(level)}` }), h('h1', { text: level.name })),
            h('div', { class: 'topbar-actions' },
                iconButton('restart', 'Recommencer', () => { controller.restart(); }),
                undoButton, hintButton,
                iconButton('settings', 'Réglages', () => ctx.go({ screen: 'settings', back: { screen: 'play', level } })))),
        room,
        h('aside', { class: 'tray', 'aria-label': 'Cartons et tampon' },
            boxes,
            h('div', { class: 'buffer-wrap' }, h('span', { class: 'tray-label', text: 'Tampon' }), buffer),
            score),
        h('nav', { class: 'sr-only', 'aria-label': 'Objets à portée' }, h('h2', { text: 'Objets à portée' }), reachable),
        live, dialog);

    const say = (text: string): void => { live.textContent = text; };
    const sticker = (): string => getComputedStyle(document.documentElement).getPropertyValue('--crs-sticker').trim();
    let fresh = new Set<string>();

    const showEnd = (state: GameState, won: GameEvent | undefined): void => {
        if (state.status === 'playing') { dialog.hidden = true; dialog.replaceChildren(); return; }
        const next = nextLevel(level);
        if (won?.type === 'LEVEL_WON' || state.status === 'won') {
            const count = won?.type === 'LEVEL_WON' ? won.stars : 1;
            dialog.replaceChildren(h('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'end-title' },
                h('h2', { id: 'end-title', text: 'Pièce rangée !' }), stars(count),
                h('p', { text: `${state.bufferedCount} passage${state.bufferedCount > 1 ? 's' : ''} au tampon.` }),
                h('div', { class: 'dialog-actions' },
                    next ? h('button', { type: 'button', class: 'button primary', 'data-action': 'next', onclick: () => ctx.go({ screen: 'play', level: next }), text: 'Niveau suivant' }) : null,
                    h('button', { type: 'button', class: 'button', 'data-action': 'replay', onclick: () => controller.restart(), text: 'Rejouer' }),
                    h('button', { type: 'button', class: 'button', onclick: () => ctx.go({ screen: 'levels' }), text: 'Niveaux' }))));
        } else {
            dialog.replaceChildren(h('div', { class: 'dialog', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'end-title' },
                h('h2', { id: 'end-title', text: 'Le tampon déborde' }),
                h('p', { text: 'Plus aucun objet ne peut bouger.' }),
                h('div', { class: 'dialog-actions' },
                    rules.allowUndo && state.history.length > 0 && state.undoCount < (rules.undoLimit ?? Infinity)
                        ? h('button', { type: 'button', class: 'button primary', onclick: () => controller.undo(), text: 'Annuler' }) : null,
                    h('button', { type: 'button', class: 'button', 'data-action': 'replay', onclick: () => controller.restart(), text: 'Recommencer' }))));
        }
        dialog.hidden = false;
        dialog.querySelector<HTMLButtonElement>('button')?.focus();
    };

    const render = (state: GameState, events: readonly GameEvent[]): void => {
        fresh = new Set(events.flatMap(e => e.type === 'BOX_ACTIVATED' ? [e.boxId] : []));
        renderBoxes(boxes, level, state, fresh);
        renderBuffer(buffer, controller.level, state, ctx.tone(), sticker());
        renderScore(score, level, state);
        renderReachable(reachable, level, state, id => controller.select(id));
        badge(undoButton, rules.undoLimit !== undefined && rules.undoLimit < 200 ? rules.undoLimit - state.undoCount : null);
        badge(hintButton, rules.hintLimit !== undefined ? rules.hintLimit - state.hintCount : null);
        undoButton.disabled = state.history.length === 0 || state.undoCount >= (rules.undoLimit ?? Infinity);
        hintButton.disabled = state.status !== 'playing' || state.hintCount >= (rules.hintLimit ?? Infinity);
        const won = events.find(e => e.type === 'LEVEL_WON');
        if (won?.type === 'LEVEL_WON') {
            void ctx.store.recordResult(level.id, { stars: won.stars, bestBuffered: won.bufferedCount });
            say(`Pièce rangée, ${won.stars} étoile${won.stars > 1 ? 's' : ''}.`);
        } else if (events.some(e => e.type === 'BOX_COMPLETED')) say('Carton plein, le suivant s\'ouvre.');
        else if (events.some(e => e.type === 'ACTION_REJECTED' && e.reason === 'not-accessible')) say('Cet objet est encore coincé.');
        showEnd(state, won);
    };
    controller.subscribe(render);
    render(controller.state, []);

    let game: Phaser.Game | undefined;
    let scene: RoomScene | undefined;
    const offTone = ctx.onTone(() => { render(controller.state, []); void scene?.refreshTheme(); });
    const dispose = installTestHooks(() => ({ controller, scene }));

    return {
        element,
        mounted: () => {
            ({ game, scene } = startRoom(room, {
                level, controller, tone: ctx.tone,
                targetOf: event => event.type === 'OBJECT_PACKED' ? element.querySelector(`[data-box="${event.boxId}"]`) ?? boxes
                    : [...buffer.querySelectorAll('.slot-full')].at(-1) ?? buffer,
                onReady: () => { element.dataset['ready'] = 'true'; }
            }));
        },
        dispose: () => { offTone(); dispose(); game?.destroy(true); }
    };
}
