// Fondu de bas de vue : la planche coupe la pointe basse de certaines vues par une base plate. Un dégradé
// d'interface, posé sur le bas de la boîte de la vue, la fond dans la couleur de la page. Aucun pixel d'atlas n'est touché.
import { h } from './dom.ts';

export interface Box { x: number; y: number; width: number; height: number }

/** Calque du fondu pour un thème qui le déclare (`vue_fondu_bas`, fraction de la hauteur de la vue), sinon rien. */
export function viewFade(theme: { vue_fondu_bas?: number }): HTMLElement | null {
    const fraction = theme.vue_fondu_bas;
    if (fraction === undefined || !(fraction > 0)) return null;
    return h('div', { class: 'view-fade', 'aria-hidden': 'true', 'data-fraction': fraction });
}

/** Pose le calque sur le bas de la vue `view` (coordonnées de la fenêtre), relativement à la boîte `origin`. */
export function placeViewFade(fade: HTMLElement, view: Box | null, origin: { left: number; top: number }): void {
    const fraction = Number(fade.dataset['fraction']);
    fade.hidden = !view;
    if (!view) return;
    const height = view.height * fraction;
    Object.assign(fade.style, {
        left: `${view.x - origin.left}px`, top: `${view.y + view.height - height - origin.top}px`,
        width: `${view.width}px`, height: `${height}px`
    });
}
