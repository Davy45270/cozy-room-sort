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

const declared = (selector: string): CSSStyleRule[] => rules().filter(rule => rule.selectorText.split(/,\s*/).includes(selector));
const allRules = (): CSSStyleRule[] => {
    const style = document.createElement('style');
    style.textContent = readFileSync('apps/web/src/styles.css', 'utf8');
    document.head.append(style);
    const flat = (list: CSSRuleList): CSSRule[] => Array.from(list).flatMap(rule => rule instanceof CSSMediaRule ? flat(rule.cssRules) : [rule]);
    const result = flat(style.sheet!.cssRules).filter(rule => rule instanceof CSSStyleRule);
    style.remove();
    return result;
};

it('les tranches du panneau des quotas restent visibles', () => {
    for (const rule of allRules().filter(item => /border-cell|atlas-border|quota/.test(item.selectorText))) {
        const opacity = rule.style.getPropertyValue('opacity');
        expect(opacity === '' || Number.parseFloat(opacity) >= 1, `${rule.selectorText} opacity ${opacity}`).toBe(true);
        expect(rule.style.getPropertyValue('visibility'), rule.selectorText).not.toBe('hidden');
        if (/border-cell/.test(rule.selectorText)) expect(rule.style.getPropertyValue('display'), rule.selectorText).not.toBe('none');
    }
});

it('la case du tampon occupe toute sa colonne et suit la proportion de son dessin, sans hauteur imposée', () => {
    const slotArt = declared('.slot-art');
    expect(slotArt.map(rule => rule.style.getPropertyValue('width'))).toEqual(['100%']);
    for (const rule of allRules().filter(item => item.selectorText.split(/,\s*/).some(part => /^\.slot(?:-art)?$/.test(part)))) {
        expect(rule.style.getPropertyValue('height'), rule.selectorText).toBe('');
        expect(rule.style.getPropertyValue('max-width'), rule.selectorText).toBe('');
    }
    const object = allRules().filter(rule => rule.selectorText === '.slot-object');
    // L'objet rangé tient dans la hauteur de la case.
    expect(object.map(rule => rule.style.getPropertyValue('height'))).toEqual(['84%']);
});

it('les quotas passent sur deux colonnes au-delà de 4 catégories, sans texte de moins de 14 px', () => {
    const grid = allRules().find(rule => rule.selectorText === '.quota-list[data-columns="2"]' && rule.style.getPropertyValue('grid-template-columns'));
    expect(grid?.style.getPropertyValue('display')).toBe('grid');
    expect(grid?.style.getPropertyValue('grid-template-columns')).toMatch(/^repeat\(2,/);
    for (const rule of allRules().filter(item => /quota/.test(item.selectorText))) {
        const size = rule.style.getPropertyValue('font-size');
        if (!size) continue;
        const px = size.endsWith('rem') ? Number.parseFloat(size) * 16 : Number.parseFloat(size);
        expect(px, `${rule.selectorText} ${size}`).toBeGreaterThanOrEqual(14);
    }
});
