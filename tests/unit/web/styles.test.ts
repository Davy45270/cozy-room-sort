// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

function rules(): CSSStyleRule[] {
    const style = document.createElement('style');
    style.textContent = readFileSync('apps/web/src/styles.css', 'utf8');
    document.head.append(style);
    const result = Array.from(style.sheet!.cssRules).filter(rule => rule instanceof CSSStyleRule);
    style.remove();
    return result;
}

it('supprime le contour des titres focalisés et arrondit le focus clavier des sprites', () => {
    const styles = rules();
    for (const focus of ['focus', 'focus-visible']) {
        const headingRule = styles.find(rule => rule.selectorText.split(/,\s*/).includes(`[tabindex="-1"]:${focus}`)
            && rule.style.outlineStyle === 'none');
        expect(headingRule).toBeDefined();
    }
    const spriteFocus = styles.find(rule => rule.selectorText.includes('.icon-button:focus-visible'));
    expect(spriteFocus?.style.boxShadow).toContain('var(--crs-');
    expect(spriteFocus?.style.borderRadius).toBe('var(--sprite-radius)');
});
