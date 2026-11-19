// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { THEMES } from '../../../apps/web/src/content.ts';
import { fadeBox, fadeFraction, pageColor } from '../../../apps/web/src/scene/view-fade.ts';
import salleDeBain from '../../../content/themes/salle-de-bain.json' with { type: 'json' };

it('seul le thème qui le déclare reçoit un fondu', () => {
    expect(salleDeBain.vue_fondu_bas).toBe(0.07);
    for (const theme of Object.values(THEMES)) {
        expect(fadeFraction(theme), theme.id).toBe(theme.id === 'salle-de-bain' ? 0.07 : null);
    }
    expect(fadeFraction({ vue_fondu_bas: 0 })).toBeNull();
});

it('la boîte du fondu est la bande basse de la vue, sur toute sa largeur', () => {
    const small = fadeBox({ x: 16, y: 130, width: 374, height: 374 }, 0.07);
    expect(small.x).toBe(16);
    expect(small.width).toBe(374);
    expect(small.height).toBeCloseTo(26.18);
    expect(small.y).toBeCloseTo(477.82);
    const box = fadeBox({ x: 400, y: 80, width: 600, height: 600 }, 0.07);
    expect(box.x).toBe(400);
    expect(box.width).toBe(600);
    expect(box.height).toBeCloseTo(42);
    expect(box.y + box.height).toBeCloseTo(680);
});

it('la couleur du fondu est celle de la page, le fond clair à défaut', () => {
    const root = document.body.appendChild(document.createElement('div'));
    root.style.setProperty('--crs-bg', ' #2A211D');
    expect(pageColor(root)).toEqual([42, 33, 29]);
    root.style.setProperty('--crs-bg', 'rouge');
    expect(pageColor(root)).toEqual([251, 241, 220]);
    root.remove();
});

it('aucun calque de fondu en DOM ne reste devant le canevas', () => {
    expect(readFileSync('apps/web/src/styles.css', 'utf8')).not.toMatch(/view-fade/);
    expect(readFileSync('apps/web/src/screens/play.ts', 'utf8')).not.toMatch(/view-fade|viewFade/);
});
