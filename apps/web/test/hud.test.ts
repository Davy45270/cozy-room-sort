// @vitest-environment happy-dom
import { expect, it } from 'vitest';
import { levelById } from '../src/content.ts';
import { createController } from '../src/game/controller.ts';
import { renderBoxes, renderBuffer, renderQuotas } from '../src/hud.ts';

function setup() {
    const level = levelById('001-salon');
    if (!level) throw new Error('Premier niveau absent');
    return createController(level, 'classique', { save: () => Promise.resolve(), now: () => 0 });
}

it('utilise la case illustrée au début, puis une case ordinaire par place de tampon', () => {
    const controller = setup();
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
    expect(quotas.querySelectorAll('[data-frame="sprite-coche"]')).toHaveLength(0);
    for (const id of level.meta?.solution ?? []) controller.select(id);
    draw();
    expect(boxes.querySelectorAll('[data-frame="sprite-carton-ouvert"]')).toHaveLength(0);
    expect(boxes.querySelectorAll('[data-frame="sprite-carton-ferme"]')).toHaveLength(level.boxes.length);
    expect(quotas.querySelectorAll('[data-frame="sprite-coche"]')).toHaveLength(level.categories.length);
});
