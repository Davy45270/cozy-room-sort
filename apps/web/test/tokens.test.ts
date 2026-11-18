// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { applyTheme, resolveTone, themeStylesheet } from '../src/theme/apply.ts';
import { contrast, CONTRAST_PAIRS, TOKEN_NAMES, TOKENS, type Tone } from '../src/theme/tokens.ts';

const tones: Tone[] = ['light', 'dark'];

describe('palette en tokens', () => {
    it.each(tones.flatMap(t => CONTRAST_PAIRS.map(([fg, bg, min]) => [t, fg, bg, min] as const)))('%s : %s sur %s ≥ %f:1', (tone, fg, bg, min) => {
        expect(contrast(TOKENS[tone][fg], TOKENS[tone][bg])).toBeGreaterThanOrEqual(min);
    });

    it('chaque token existe dans les deux modes, en #RRGGBB', () => {
        for (const tone of tones) for (const name of TOKEN_NAMES) expect(TOKENS[tone][name]).toMatch(/^#[0-9A-F]{6}$/);
    });

    it('le calcul de contraste rend 21:1 pour noir sur blanc', () => {
        expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    });

    it('la feuille déclare les deux modes, système et forcé', () => {
        const css = themeStylesheet();
        expect(css).toContain('prefers-color-scheme: dark');
        expect(css).toContain(':root[data-theme="dark"]');
        expect(css).toContain(`--crs-bg: ${TOKENS.dark.bg}`);
    });

    it('le mode forcé l\'emporte sur le système', () => {
        expect(resolveTone('light', true)).toBe('light');
        expect(resolveTone('dark', false)).toBe('dark');
        expect(resolveTone('auto', true)).toBe('dark');
    });

    it('applyTheme(\'dark\') pose data-theme="dark"', () => {
        expect(applyTheme('dark')).toBe('dark');
        expect(document.documentElement.dataset['theme']).toBe('dark');
    });
});
