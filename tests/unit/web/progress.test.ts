// @vitest-environment happy-dom
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { spriteOf } from '../../../apps/web/src/atlas.ts';
import { levelById } from '../../../apps/web/src/content.ts';
import { stretchedCropStyle } from '../../../apps/web/src/dom.ts';
import { createController } from '../../../apps/web/src/game/controller.ts';
import { PROGRESS_EMPTY, PROGRESS_FILLED, PROGRESS_TRACK, createProgress, progressPercent, renderProgress } from '../../../apps/web/src/hud.ts';

it('recadre un rectangle d’un cadre d’atlas sur toute sa boîte', () => {
    // Atlas 1000 × 500, cadre posé en (100, 50), partie utile décalée de (0, 20) ; rectangle 40 × 25 en (10, 5).
    expect(stretchedCropStyle({ w: 1000, h: 500 }, { x: 100, y: 50 }, { x: 0, y: 20 }, { x: 10, y: 5, w: 40, h: 25 }))
        .toBe('width:2500%;height:2000%;left:-275%;top:-300%');
});

it('la largeur du remplissage suit les objets rangés, de 0 à 100 %, sans en sortir', () => {
    expect(progressPercent(0, 12)).toBe(0);
    expect(progressPercent(3, 12)).toBe(25);
    expect(progressPercent(12, 12)).toBe(100);
    expect(progressPercent(13, 12)).toBe(100);
    expect(progressPercent(0, 0)).toBe(0);
});

/**
 * Bord gauche de l'étoile imprimée sur le cadre « barre-progression » (coordonnées de sa partie utile 256 × 61).
 * Mesuré le 19/11/2026 sur l'atlas p01-panneaux.webp décodé (dwebp) : premier pixel de saturation HSV ≥ 0,6 à
 * partir de x 150, sur chaque ligne y 19 à 52. Minimum 191 (lignes 20 et 23 à 26 ; 192 en y 19, 202 en y 39).
 * La piste s'arrête au moins 1 px avant : bord droit exclusif ≤ 190.
 */
const STAR_LEFT_EDGE = 191;
const STAR_GUARD = 1;

it('les zones de la jauge restent dans l’intérieur du cadre, la piste avant l’étoile', () => {
    const { hitbox } = spriteOf('barre-progression');
    expect(STAR_LEFT_EDGE).toBeLessThan(hitbox.w);
    for (const zone of [PROGRESS_EMPTY, PROGRESS_FILLED]) {
        expect(zone.x).toBeGreaterThanOrEqual(PROGRESS_TRACK.x);
        expect(zone.x + zone.w).toBeLessThanOrEqual(PROGRESS_TRACK.x + PROGRESS_TRACK.w);
        expect(zone.y).toBe(PROGRESS_TRACK.y);
        expect(zone.h).toBe(PROGRESS_TRACK.h);
    }
    // Partie verte à gauche, partie sombre à droite, sans chevauchement.
    expect(PROGRESS_FILLED.x + PROGRESS_FILLED.w).toBeLessThan(PROGRESS_EMPTY.x);
    expect(PROGRESS_TRACK.x + PROGRESS_TRACK.w).toBeLessThanOrEqual(STAR_LEFT_EDGE - STAR_GUARD);
    expect(PROGRESS_TRACK.y + PROGRESS_TRACK.h).toBeLessThanOrEqual(hitbox.h);
});

/** Pixels du cadre décodés avec PIL (lignes y 30 à 38, x 0 à 199) et empreinte de l'atlas d'où ils viennent. */
const reference = JSON.parse(readFileSync('tests/fixtures/jauge-p01-lignes.json', 'utf8')) as
    { atlas: string; sha256: string; lignes: Record<string, [number, number, number][]> };
const TOLERANCE = 8;
const distance = (a: readonly number[], b: readonly number[]): number => Math.hypot(...a.map((v, i) => v - (b[i] ?? 0)));
const median = (values: number[]): number => { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.floor(sorted.length / 2)] ?? NaN; };
/** Premier x à partir duquel la ligne reste, jusqu'à x 189, à moins de TOLERANCE du brun médian de x 145 à 189. */
const brownStart = (row: [number, number, number][]): number => {
    const track = row.slice(145, 190);
    const brown = [0, 1, 2].map(channel => median(track.map(pixel => pixel[channel] ?? NaN)));
    let start = 189;
    while (start > 0 && distance(row[start - 1] ?? [], brown) <= TOLERANCE) start--;
    return start;
};

it('le remplissage prend la partie verte et toute sa transition, jusqu’au brun de la planche, sans y entrer', () => {
    expect(createHash('sha256').update(readFileSync(reference.atlas)).digest('hex'), 'atlas changé : remesurer la jauge').toBe(reference.sha256);
    const starts = Object.values(reference.lignes).map(brownStart);
    expect(starts.length).toBe(9);
    // Le remplissage commence au bord gauche de la piste, et s'arrête où commence le brun (médiane des lignes 30 à 38).
    expect(PROGRESS_FILLED.x).toBe(PROGRESS_TRACK.x);
    expect(PROGRESS_FILLED.x + PROGRESS_FILLED.w).toBe(median(starts));
    expect(median(starts)).toBe(136);
    for (const row of Object.values(reference.lignes)) {
        const crop = row.slice(PROGRESS_FILLED.x, PROGRESS_FILLED.x + PROGRESS_FILLED.w);
        // Majorité verte (G au-dessus de R) : c'est bien la partie remplie, pas la piste.
        expect(crop.filter(([r, g]) => g - r > 30).length / crop.length).toBeGreaterThan(0.7);
    }
});

it('la jauge montre la piste et le remplissage du cadre de la planche : vide au départ, pleine à la fin', () => {
    const level = levelById('001-salon');
    if (!level) throw new Error('Premier niveau absent');
    const controller = createController(level, 'classique', { save: () => Promise.resolve(), now: () => 0 });
    const progress = createProgress(level);
    const { atlas } = spriteOf('barre-progression');
    // Toutes les images de la jauge viennent de l'atlas du cadre ; aucun aplat posé en style.
    const images = [...progress.querySelectorAll('img')];
    expect(images.length).toBe(3);
    for (const image of images) expect(image.getAttribute('src')).toBe(atlas.image);
    for (const element of progress.querySelectorAll<HTMLElement>('*')) expect(element.style.background + element.style.backgroundColor).toBe('');
    const track = progress.querySelector<HTMLElement>('.progress-track');
    expect(track?.querySelector('.progress-empty[data-frame="sprite-barre-progression"]')?.getAttribute('data-crop'))
        .toBe(Object.values(PROGRESS_EMPTY).join(' '));
    const fill = progress.querySelector<HTMLElement>('.progress-fill');
    expect(fill?.querySelector('[data-frame="sprite-barre-progression"]')?.getAttribute('data-crop'))
        .toBe(Object.values(PROGRESS_FILLED).join(' '));

    renderProgress(progress, level, controller.state);
    expect(fill?.style.width).toBe('0%');
    expect(progress.getAttribute('aria-valuenow')).toBe('0');
    for (const id of level.meta?.solution ?? []) controller.select(id);
    renderProgress(progress, level, controller.state);
    expect(fill?.style.width).toBe('100%');
    expect(progress.getAttribute('aria-valuenow')).toBe(String(level.objects.length));
});
