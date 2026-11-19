// @vitest-environment happy-dom
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

it('les zones de la jauge restent dans l’intérieur du cadre, la piste avant l’étoile', () => {
    const { hitbox } = spriteOf('barre-progression');
    for (const zone of [PROGRESS_EMPTY, PROGRESS_FILLED]) {
        expect(zone.x).toBeGreaterThanOrEqual(PROGRESS_TRACK.x);
        expect(zone.x + zone.w).toBeLessThanOrEqual(PROGRESS_TRACK.x + PROGRESS_TRACK.w);
        expect(zone.y).toBe(PROGRESS_TRACK.y);
        expect(zone.h).toBe(PROGRESS_TRACK.h);
    }
    // Partie verte à gauche, partie sombre à droite, sans chevauchement.
    expect(PROGRESS_FILLED.x + PROGRESS_FILLED.w).toBeLessThan(PROGRESS_EMPTY.x);
    expect(PROGRESS_TRACK.x + PROGRESS_TRACK.w).toBeLessThanOrEqual(hitbox.w);
    expect(PROGRESS_TRACK.y + PROGRESS_TRACK.h).toBeLessThanOrEqual(hitbox.h);
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
