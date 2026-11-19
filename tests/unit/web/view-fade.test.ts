// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { THEMES } from '../../../apps/web/src/content.ts';
import { placeViewFade, viewFade } from '../../../apps/web/src/view-fade.ts';
import salleDeBain from '../../../content/themes/salle-de-bain.json' with { type: 'json' };

it('seul le thème qui le déclare reçoit un calque de fondu', () => {
    expect(salleDeBain.vue_fondu_bas).toBe(0.07);
    for (const theme of Object.values(THEMES)) {
        const fade = viewFade(theme);
        if (theme.id === 'salle-de-bain') expect(fade?.getAttribute('aria-hidden')).toBe('true');
        else expect(fade, theme.id).toBeNull();
    }
});

it('le calque couvre la fraction déclarée du bas de la vue et suit son redimensionnement', () => {
    const fade = viewFade(salleDeBain) as HTMLElement;
    const origin = { left: 10, top: 20 };
    for (const view of [{ x: 16, y: 130, width: 374, height: 374 }, { x: 400, y: 80, width: 600, height: 600 }]) {
        placeViewFade(fade, view, origin);
        const px = (value: string): number => Number.parseFloat(value);
        expect(fade.hidden).toBe(false);
        expect(px(fade.style.left)).toBeCloseTo(view.x - origin.left);
        expect(px(fade.style.width)).toBeCloseTo(view.width);
        expect(px(fade.style.height)).toBeCloseTo(view.height * 0.07);
        // Le bas du calque est le bas de la vue.
        expect(px(fade.style.top) + px(fade.style.height)).toBeCloseTo(view.y + view.height - origin.top);
    }
    placeViewFade(fade, null, origin);
    expect(fade.hidden).toBe(true);
});

it('le fondu va du transparent à la couleur de la page et laisse passer le toucher', () => {
    const css = readFileSync('apps/web/src/styles.css', 'utf8');
    const rule = /\.view-fade\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(rule).toMatch(/pointer-events:\s*none/);
    expect(rule).toMatch(/linear-gradient\(to bottom,\s*transparent,\s*var\(--crs-bg\)\)/);
});
