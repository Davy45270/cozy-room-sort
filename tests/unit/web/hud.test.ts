// @vitest-environment happy-dom
import { expect, it } from 'vitest';
import { levelById } from '../../../apps/web/src/content.ts';
import { createController } from '../../../apps/web/src/game/controller.ts';
import { renderBoxes, renderBuffer, renderQuotas } from '../../../apps/web/src/hud.ts';

function setup(id = '001-salon') {
    const level = levelById(id);
    if (!level) throw new Error('Premier niveau absent');
    return createController(level, 'classique', { save: () => Promise.resolve(), now: () => 0 });
}

it('utilise la case illustrée au début, puis une case ordinaire par place de tampon', () => {
    const controller = setup('004-salon');
    const { level } = controller;
    const buffer = document.createElement('div');
    const draw = (): void => renderBuffer(buffer, level, controller.state, !controller.hasPlayed);
    draw();
    expect(buffer.querySelectorAll('[data-buffer-slot]')).toHaveLength(level.rules.bufferCapacity);
    expect(buffer.querySelectorAll('[data-frame="sprite-case-tampon-aide"]')).toHaveLength(1);
    expect(buffer.querySelectorAll('[data-frame="sprite-case-tampon"]')).toHaveLength(level.rules.bufferCapacity - 1);
    for (const id of level.meta?.solution ?? []) {
        controller.select(id);
        if (controller.state.bufferObjectIds.length) break;
    }
    draw();
    const object = level.objects.find(item => item.id === controller.state.bufferObjectIds[0]);
    expect(object).toBeDefined();
    expect(buffer.querySelector('[data-frame="sprite-case-tampon-aide"]')).toBeNull();
    expect(buffer.querySelector(`[data-buffer-object="${object?.id}"] [data-frame="sprite-${object?.asset}"] img`)).toBeInstanceOf(HTMLImageElement);
});

it('ferme les cartons complets et pose une coche par catégorie rangée', () => {
    const controller = setup();
    const { level } = controller;
    const boxes = document.createElement('div');
    const quotas = document.createElement('div');
    const draw = (): void => {
        renderBoxes(boxes, level, controller.state);
        renderQuotas(quotas, level, controller.state);
    };
    draw();
    expect(boxes.querySelectorAll('[data-frame="sprite-carton-ouvert"]')).toHaveLength(level.rules.activeBoxCount);
    expect(controller.state.pendingBoxIds.length).toBeGreaterThan(0);
    expect([...boxes.querySelectorAll('.box-pending')].map(box => box.getAttribute('data-box')))
        .toEqual(controller.state.pendingBoxIds);
    for (const box of boxes.querySelectorAll('.box-pending')) {
        expect(box.querySelector('[data-frame="sprite-carton-ferme"]')).not.toBeNull();
        expect(box.querySelector('.box-icon')).not.toBeNull();
    }
    expect(quotas.querySelectorAll('[data-frame="sprite-coche"]')).toHaveLength(0);
    for (const id of level.meta?.solution ?? []) controller.select(id);
    draw();
    expect(boxes.querySelectorAll('[data-frame="sprite-carton-ouvert"]')).toHaveLength(0);
    expect(boxes.querySelectorAll('[data-frame="sprite-carton-ferme"]')).toHaveLength(level.boxes.length);
    expect(boxes.querySelectorAll('[data-frame="sprite-coche"]')).toHaveLength(level.boxes.length);
    expect(quotas.querySelectorAll('[data-frame="sprite-coche"]')).toHaveLength(level.categories.length);
});
