import { starsFor, type GameState } from '@cozy-room-sort/engine';
import type { Level } from '@cozy-room-sort/schemas';
import { labelOf, objectName, pictoOf } from './content.ts';
import { spriteOf, type Rectangle } from './atlas.ts';
import { atlasBorder, atlasCrop, atlasImage, h, stars } from './dom.ts';
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

/**
 * Tranches du cadre « panneau-quotas-sdb » de la planche 04 (haut, droite, bas, gauche, en pixels de sa partie utile
 * 256 × 217). Mesurées sur le cadre : le contenu imprimé (icônes, coches et leur fond pâle) le plus proche d'un bord en est
 * à 12 px en haut, 26 à droite, 11 en bas et 38 à gauche ; les coins arrondis s'étendent sur 24 px de large. Les tranches
 * restent en deçà du contenu, et celles de côté prennent le coin entier en largeur. Le centre n'est pas repris.
 */
export const QUOTA_SLICE_SDB = [10, 24, 9, 24] as const;

type Slice = readonly [number, number, number, number];

/** Panneau des quotas d'une pièce : la salle de bain a le sien (planche 04), les autres celui de la planche 01. */
export function quotaPanelOf(level: Level): { asset: string; slice: Slice } {
    return level.theme === 'salle-de-bain'
        ? { asset: 'panneau-quotas-sdb', slice: QUOTA_SLICE_SDB }
        : { asset: 'panneau-quotas', slice: QUOTA_SLICE };
}

/** Au-delà de ce nombre de catégories, les quotas passent sur deux colonnes. */
export const QUOTA_ONE_COLUMN_MAX = 4;

export function renderQuotas(container: HTMLElement, level: Level, state: GameState): void {
    const twoColumns = level.categories.length > QUOTA_ONE_COLUMN_MAX;
    const panel = quotaPanelOf(level);
    container.dataset['panel'] = panel.asset;
    container.replaceChildren(atlasBorder(panel.asset, panel.slice, .75, 'quota-frame'), h('div', { class: 'quota-content' }, h('h2', { text: 'Quotas' }),
        h('ul', { class: 'quota-list', 'data-columns': twoColumns ? 2 : undefined }, ...level.categories.map(category => {
            const boxes = level.boxes.filter(box => box.category === category.id);
            const total = boxes.reduce((sum, box) => sum + box.capacity, 0);
            const packed = boxes.reduce((sum, box) => sum + (state.boxFillCounts[box.id] ?? 0), 0);
            return h('li', { class: 'quota', 'aria-label': `${category.label}, ${packed} sur ${total}`, title: twoColumns ? category.label : undefined },
                atlasImage(pictoOf(level, category.id), '', 'quota-icon'),
                h('span', { class: 'quota-label', text: category.label }),
                h('span', { class: 'quota-count', text: `${packed}/${total}` }),
                packed === total ? atlasImage('coche', 'Complet', 'quota-check') : null);
        }))));
}

/**
 * Intérieur du cadre « barre-progression » (pixels de sa partie utile 256 × 61), mesuré sur le cadre : la piste va du
 * bord gauche (x 8) jusqu'avant l'étoile, de y 19 à 52. L'étoile commence en x 191 au plus tôt sur ces lignes (contour
 * compris) ; la piste s'arrête en x 190 exclu, avec 1 px de garde. La planche y dessine une partie verte (x 8 à 112, bout
 * arrondi compris) puis une partie sombre (x 145 à 190, unie en largeur). Aucun aplat ni dégradé : la piste vide montre
 * la partie sombre étirée, le remplissage la partie verte étirée à la largeur de la progression, du même atlas.
 */
export const PROGRESS_TRACK: Readonly<Rectangle> = { x: 8, y: 19, w: 182, h: 33 };
export const PROGRESS_FILLED: Readonly<Rectangle> = { x: 8, y: 19, w: 104, h: 33 };
export const PROGRESS_EMPTY: Readonly<Rectangle> = { x: 145, y: 19, w: 45, h: 33 };

/** Part des objets rangés, en pour cent, bornée à [0, 100]. */
export function progressPercent(packed: number, total: number): number {
    return total > 0 ? Math.min(100, Math.max(0, packed / total * 100)) : 0;
}

/** Jauge : le cadre de la planche (bord et étoile), sa piste sombre par-dessus l'intérieur, puis le remplissage vert. */
export function createProgress(level: Level): HTMLElement {
    const { hitbox } = spriteOf('barre-progression');
    const percent = (number: number, extent: number): string => `${number / extent * 100}%`;
    const { x, y, w, h: height } = PROGRESS_TRACK;
    const inset = `top:${percent(y, hitbox.h)};right:${percent(hitbox.w - x - w, hitbox.w)};bottom:${percent(hitbox.h - y - height, hitbox.h)};left:${percent(x, hitbox.w)}`;
    return h('div', { class: 'progress', role: 'progressbar', 'aria-label': 'Objets rangés', 'aria-valuemin': 0, 'aria-valuemax': level.objects.length },
        atlasImage('barre-progression'),
        h('span', { class: 'progress-track', 'aria-hidden': 'true', style: inset },
            atlasCrop('barre-progression', PROGRESS_EMPTY, 'progress-empty'),
            h('span', { class: 'progress-fill', style: 'width:0%' }, atlasCrop('barre-progression', PROGRESS_FILLED, 'progress-filled'))));
}

export function renderProgress(container: HTMLElement, level: Level, state: GameState): void {
    const packed = Object.keys(state.packedIn).length;
    container.setAttribute('aria-valuenow', String(packed));
    container.querySelector<HTMLElement>('.progress-fill')?.style.setProperty('width', `${progressPercent(packed, level.objects.length)}%`);
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
