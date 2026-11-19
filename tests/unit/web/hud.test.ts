// @vitest-environment happy-dom
import { expect, it } from 'vitest';
import { levelById } from '../../../apps/web/src/content.ts';
import { createController } from '../../../apps/web/src/game/controller.ts';
import { spriteOf } from '../../../apps/web/src/atlas.ts';
import { QUOTA_SLICE, renderBoxes, renderBuffer, renderQuotas } from '../../../apps/web/src/hud.ts';

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

it('borde le panneau des quotas avec le cadre de la planche, sans en reprendre le centre', () => {
    const controller = setup();
    const quotas = document.createElement('div');
    renderQuotas(quotas, controller.level, controller.state);
    const border = quotas.querySelector('.atlas-border[data-frame="sprite-panneau-quotas"]');
    expect(border).not.toBeNull();
    expect(border?.getAttribute('aria-hidden')).toBe('true');
    // Huit tranches : quatre coins et quatre bords ; aucune pour le centre (icônes et coches préimprimées).
    const cells = [...border!.querySelectorAll('.border-cell')].map(cell => cell.getAttribute('data-cell'));
    expect(cells.sort()).toEqual(['00', '01', '02', '10', '12', '20', '21', '22']);
    expect(border?.querySelectorAll('img')).toHaveLength(8);
    // Le cadre entier n'est jamais posé tel quel.
    expect(quotas.querySelectorAll('.atlas-frame[data-frame="sprite-panneau-quotas"]')).toHaveLength(0);
    // Tranches en deçà du contenu mesuré sur le cadre (haut 16, droite 18, bas 14, gauche 43).
    const [top, right, bottom, left] = QUOTA_SLICE;
    expect(top).toBeLessThan(16);
    expect(right).toBeLessThan(18);
    expect(bottom).toBeLessThan(14);
    expect(left).toBeLessThan(43);
    expect(border?.getAttribute('data-slice')).toBe(QUOTA_SLICE.join(' '));
    expect(quotas.querySelector('h2')?.textContent).toBe('Quotas');
    expect(quotas.querySelectorAll('.quota')).toHaveLength(controller.level.categories.length);
});

it('chaque tranche montre la bonne partie du cadre dans l’atlas', () => {
    const controller = setup();
    const quotas = document.createElement('div');
    renderQuotas(quotas, controller.level, controller.state);
    const { atlas, frame, hitbox } = spriteOf('panneau-quotas');
    const [top, right, bottom, left] = QUOTA_SLICE;
    const xs = [0, left, hitbox.w - right, hitbox.w];
    const ys = [0, top, hitbox.h - bottom, hitbox.h];
    for (const cell of quotas.querySelectorAll<HTMLElement>('.border-cell')) {
        const [row, col] = cell.dataset['cell']!.split('').map(Number) as [number, number];
        const w = xs[col + 1]! - xs[col]!;
        const h = ys[row + 1]! - ys[row]!;
        const img = cell.querySelector('img')!;
        const pct = (value: string): number => Number.parseFloat(value) / 100;
        // La tranche affichée commence à (frame + hitbox + début de tranche) et mesure w × h pixels de l'atlas.
        expect(pct(img.style.width) * w).toBeCloseTo(atlas.w);
        expect(pct(img.style.height) * h).toBeCloseTo(atlas.h);
        expect(-pct(img.style.left) * w).toBeCloseTo(frame.x + hitbox.x + xs[col]!);
        expect(-pct(img.style.top) * h).toBeCloseTo(frame.y + hitbox.y + ys[row]!);
    }
});

it('après chaque coup d’une trace rejouée, chaque quota affiche le compte du moteur', () => {
    for (const id of ['001-salon', '004-salon', '011-chambre']) {
        const controller = setup(id);
        const { level } = controller;
        const quotas = document.createElement('div');
        const categoryOf = new Map(level.objects.map(object => [object.id, object.category]));
        const check = (): void => {
            renderQuotas(quotas, level, controller.state);
            for (const category of level.categories) {
                // Oracle indépendant du HUD : objets rangés de la catégorie, d'après le moteur.
                const packed = Object.keys(controller.state.packedIn).filter(object => categoryOf.get(object) === category.id).length;
                const total = level.boxes.filter(box => box.category === category.id).reduce((sum, box) => sum + box.capacity, 0);
                const row = [...quotas.querySelectorAll('.quota')].find(item => item.querySelector('.quota-label')?.textContent === category.label);
                expect(row?.querySelector('.quota-count')?.textContent, `${id} ${category.id}`).toBe(`${packed}/${total}`);
                expect(row?.querySelector('[data-frame="sprite-coche"]') !== null).toBe(packed === total);
            }
        };
        check();
        const solution = level.meta?.solution ?? [];
        expect(solution.length).toBeGreaterThan(0);
        for (const move of solution) {
            controller.select(move);
            check();
        }
        expect(controller.state.status).toBe('won');
    }
});
