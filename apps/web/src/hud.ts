import { starsFor, type GameState } from '@cozy-room-sort/engine';
import type { Level } from '@cozy-room-sort/schemas';
import { labelOf, objectName, pictoOf } from './content.ts';
import { atlasBorder, atlasImage, h, stars } from './dom.ts';
import type { Controller } from './game/controller.ts';

export function renderBoxes(container: HTMLElement, level: Level, state: GameState): void {
    container.replaceChildren(...level.boxes.map(box => {
        const pending = state.pendingBoxIds.includes(box.id);
        const fill = state.boxFillCounts[box.id] ?? 0;
        const completed = state.completedBoxIds.includes(box.id);
        const status = pending ? 'en attente' : completed ? 'fermé' : 'actif';
        const closed = pending || completed;
        const label = labelOf(level, box.category);
        return h('div', { class: pending ? 'box box-pending' : 'box', 'data-box': box.id, role: 'group',
            'aria-label': `Carton ${label}, ${fill} sur ${box.capacity}, ${status}` },
            h('span', { class: 'box-picture' },
                atlasImage(closed ? 'carton-ferme' : 'carton-ouvert', '', 'box-art'),
                atlasImage(pictoOf(level, box.category), '', 'box-icon'),
                completed ? atlasImage('coche', '', 'box-check') : null),
            h('span', { class: 'box-count', text: `${fill}/${box.capacity}` }));
    }));
}

export function renderBuffer(container: HTMLElement, level: Level, state: GameState, showHelp: boolean): void {
    const capacity = level.rules.bufferCapacity;
    const slots = Array.from({ length: capacity }, (_, index) => {
        const id = state.bufferObjectIds[index];
        const object = level.objects.find(item => item.id === id);
        return h('div', { class: object ? 'slot slot-full' : 'slot', 'data-buffer-slot': index, 'data-buffer-object': id },
            atlasImage(showHelp && index === 0 ? 'case-tampon-aide' : 'case-tampon', '', 'slot-art'),
            object ? atlasImage(object.asset, objectName(object.asset), 'slot-object') : null);
    });
    container.style.setProperty('--slot-count', String(capacity));
    container.setAttribute('aria-label', `Tampon, ${state.bufferObjectIds.length} sur ${capacity}`);
    container.replaceChildren(...slots);
}

/**
 * Tranches du cadre « panneau-quotas » (haut, droite, bas, gauche, en pixels de sa partie utile 256 × 248). La planche
 * y dessine ses propres icônes et coches : mesurées sur le cadre, la plus proche d'un bord en est à 16 px en haut,
 * 18 à droite (fond pâle des coches), 14 en bas et 43 à gauche. Les tranches restent en deçà ; le centre n'est pas repris.
 */
export const QUOTA_SLICE = [14, 16, 12, 16] as const;

export function renderQuotas(container: HTMLElement, level: Level, state: GameState): void {
    container.replaceChildren(atlasBorder('panneau-quotas', QUOTA_SLICE, .75, 'quota-frame'), h('div', { class: 'quota-content' }, h('h2', { text: 'Quotas' }),
        h('ul', { class: 'quota-list' }, ...level.categories.map(category => {
            const boxes = level.boxes.filter(box => box.category === category.id);
            const total = boxes.reduce((sum, box) => sum + box.capacity, 0);
            const packed = boxes.reduce((sum, box) => sum + (state.boxFillCounts[box.id] ?? 0), 0);
            return h('li', { class: 'quota', 'aria-label': `${category.label}, ${packed} sur ${total}` },
                atlasImage(pictoOf(level, category.id), '', 'quota-icon'),
                h('span', { class: 'quota-label', text: category.label }),
                h('span', { class: 'quota-count', text: `${packed}/${total}` }),
                packed === total ? atlasImage('coche', 'Complet', 'quota-check') : null);
        }))));
}

export function renderProgress(container: HTMLElement, level: Level, state: GameState): void {
    const packed = Object.keys(state.packedIn).length;
    container.setAttribute('aria-valuenow', String(packed));
    container.querySelector<HTMLElement>('.progress-fill')?.style.setProperty('width', `${packed / level.objects.length * 100}%`);
}

export function renderScore(container: HTMLElement, level: Level, state: GameState): void {
    const n = state.bufferedCount;
    container.replaceChildren(stars(starsFor(level, n)),
        h('span', { text: `${n} passage${n > 1 ? 's' : ''} au tampon` }));
}

/** Le clavier conserve sa place dans la liste lorsqu'un objet disparaît. */
export function renderReachable(list: HTMLElement, controller: Controller): void {
    const previous = document.activeElement instanceof HTMLButtonElement && list.contains(document.activeElement)
        ? document.activeElement.dataset['object'] : undefined;
    const oldIndex = [...list.querySelectorAll('button')].findIndex(button => button.dataset['object'] === previous);
    const objects = controller.level.objects.filter(object => controller.isObjectAccessible(object.id));
    const buttons = objects.map(object => h('button', { type: 'button', 'data-object': object.id, onclick: () => controller.select(object.id),
        text: `${objectName(object.asset)} (${labelOf(controller.level, object.category)})` }));
    list.replaceChildren(...buttons.map(button => h('li', {}, button)));
    if (oldIndex >= 0) (buttons.find(button => button.dataset['object'] === previous) ?? buttons[Math.min(oldIndex, buttons.length - 1)])?.focus();
}
