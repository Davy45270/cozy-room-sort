// Fondu de bas de vue : la planche coupe la pointe basse de certaines vues par une base plate. Un dégradé structurel,
// posé dans la scène juste au-dessus de l'image de la vue et sous le chat, les objets et leurs envols, la fond dans la
// couleur de la page. Aucun pixel d'atlas n'est touché ; c'est le seul dégradé dessiné par code (liste blanche de
// `tests/integration/no-code-art.test.ts`).
import type Phaser from 'phaser';
import { TOKENS } from '../theme/tokens.ts';

export interface Box { x: number; y: number; width: number; height: number }

/** Clé de la texture du fondu, dessinée une fois par thème de couleur. */
export const FADE_TEXTURE = 'fondu-vue';
/** Profondeur du fondu : au-dessus du fond de la vue (0), sous le chat (1), les objets (≥ 2) et les envols. */
export const FADE_DEPTH = 0.5;

/** Fraction de la hauteur de la vue couverte par le fondu, pour un thème qui le déclare (`vue_fondu_bas`), sinon `null`. */
export function fadeFraction(theme: { vue_fondu_bas?: number }): number | null {
    const fraction = theme.vue_fondu_bas;
    return fraction !== undefined && fraction > 0 ? fraction : null;
}

/** Boîte du fondu : toute la largeur de la vue `view`, sur la fraction basse de sa hauteur. */
export function fadeBox(view: Box, fraction: number): Box {
    const height = view.height * fraction;
    return { x: view.x, y: view.y + view.height - height, width: view.width, height };
}

/** Couleur de la page (`--crs-bg`) en composantes RVB ; le fond clair si la variable est illisible. */
export function pageColor(root: HTMLElement = document.documentElement): [number, number, number] {
    const parse = (value: string): [number, number, number] | null => {
        const hex = /^#([0-9a-f]{6})$/i.exec(value.trim())?.[1];
        if (!hex) return null;
        return [0, 2, 4].map(i => Number.parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
    };
    return parse(getComputedStyle(root).getPropertyValue('--crs-bg')) ?? parse(TOKENS.light.bg)!;
}

/** Peint la texture : transparent en haut, couleur de la page en bas. */
export function paintFade(texture: Phaser.Textures.CanvasTexture, [r, g, b]: [number, number, number]): void {
    const context = texture.getContext();
    const { width, height } = texture;
    context.clearRect(0, 0, width, height);
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 1)`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    texture.refresh();
}
