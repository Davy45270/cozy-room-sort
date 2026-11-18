// Barre de jeu (DOM) : cartons ouverts, tampon, score en passages, liste accessible des objets à portée.
import { boxSvg, objectSvg } from '@cozy-room-sort/art';
import { isAccessible, snapshotOf, starsFor, type GameState } from '@cozy-room-sort/engine';
import type { Level } from '@cozy-room-sort/schemas';
import { labelOf, objectName, pictoOf } from './content.ts';
import { h, stars, svgImage } from './dom.ts';

export function renderBoxes(container: HTMLElement, level: Level, state: GameState, fresh: ReadonlySet<string>): void {
    const boxes = state.activeBoxIds.map(id => level.boxes.find(b => b.id === id)).filter(b => b !== undefined);
    const pending = state.pendingBoxIds.length;
    container.replaceChildren(
        ...boxes.map(box => {
            const fill = state.boxFillCounts[box.id] ?? 0;
            const label = labelOf(level, box.category);
            return h('div', { class: `box${fresh.has(box.id) ? ' box-new' : ''}`, 'data-box': box.id, role: 'group', 'aria-label': `Carton ${label} : ${fill} sur ${box.capacity}` },
                svgImage(boxSvg(pictoOf(level, box.category)), '', 'box-art'),
                h('span', { class: 'box-label', text: label }),
                h('span', { class: 'box-count', text: `${fill} / ${box.capacity}` }),
                h('span', { class: 'meter', 'aria-hidden': 'true' }, h('span', { class: 'meter-fill', style: `width:${Math.round((fill / box.capacity) * 100)}%` })));
        }),
        h('div', { class: 'box-pending', 'aria-label': `${pending} carton${pending > 1 ? 's' : ''} en attente` },
            h('span', { class: 'box-pending-count', text: `+${pending}` }), h('span', { text: pending > 1 ? 'cartons' : 'carton' }))
    );
}

export function renderBuffer(container: HTMLElement, level: Level, state: GameState, tone: 'light' | 'dark', sticker: string): void {
    const capacity = level.rules.bufferCapacity;
    const slots = Array.from({ length: capacity }, (_, i) => {
        const id = state.bufferObjectIds[i];
        const object = id === undefined ? undefined : level.objects.find(o => o.id === id);
        return h('div', { class: `slot${object ? ' slot-full' : ''}`, 'data-buffer-slot': i },
            object ? svgImage(objectSvg(object.asset, 64, tone === 'dark' ? sticker : undefined), objectName(object.asset)) : null);
    });
    container.setAttribute('aria-label', `Tampon : ${state.bufferObjectIds.length} sur ${capacity}`);
    container.classList.toggle('buffer-full', state.bufferObjectIds.length >= capacity);
    container.replaceChildren(...slots);
}

export function renderScore(container: HTMLElement, level: Level, state: GameState): void {
    const n = state.bufferedCount;
    container.replaceChildren(
        stars(starsFor(level, n)),
        h('span', { class: 'score-text', text: `${n} passage${n > 1 ? 's' : ''} au tampon` }),
        h('span', { class: 'score-goal', text: `3 étoiles : ${level.scoring.threeStarsMaxBuffered} au plus` })
    );
}

/** Liste visuellement masquée : un bouton par objet à portée, pour jouer au clavier ou au lecteur d'écran. */
export function renderReachable(list: HTMLElement, level: Level, state: GameState, select: (id: string) => void): void {
    const snapshot = snapshotOf(state);
    list.replaceChildren(...state.remainingObjectIds
        .filter(id => isAccessible(level, snapshot, id))
        .map(id => {
            const o = level.objects.find(x => x.id === id);
            const name = o ? `${objectName(o.asset)} (${labelOf(level, o.category)})` : id;
            return h('li', {}, h('button', { type: 'button', 'data-object': id, onclick: () => select(id), text: name }));
        }));
}
