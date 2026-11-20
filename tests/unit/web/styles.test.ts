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
    // 14 px au moins, 13 px dans le seul portrait très étroit (320 px), où les quotas passent sur une colonne.
    const narrow = new Set(mediaRules(/max-width:\s*355px/).map(rule => rule.cssText));
    for (const rule of allRules().filter(item => /quota/.test(item.selectorText))) {
        const size = rule.style.getPropertyValue('font-size');
        if (!size) continue;
        const px = size.endsWith('rem') ? Number.parseFloat(size) * 16 : Number.parseFloat(size);
        expect(px, `${rule.selectorText} ${size}`).toBeGreaterThanOrEqual(narrow.has(rule.cssText) ? 13 : 14);
    }
});

it('en portrait très étroit, la pièce descend à 150 px au plus bas et les quotas tiennent sur une colonne', () => {
    const narrow = mediaRules(/max-width:\s*355px\).*portrait/);
    const play = narrow.find(rule => rule.selectorText === '.play');
    // 150 px : la plus petite zone de jeu vérifiée par `tests/unit/web/layout.test.ts` (320 × 150).
    expect(play?.style.getPropertyValue('grid-template-rows')).toContain('minmax(min(150px, 33dvh), 100vw)');
    const list = narrow.find(rule => rule.selectorText === '.quota-list[data-columns="2"]');
    expect(list?.style.getPropertyValue('flex-direction')).toBe('column');
    for (const rule of narrow) {
        const size = rule.style.getPropertyValue('font-size');
        if (size) expect(Number.parseFloat(size), `${rule.selectorText} ${size}`).toBeGreaterThanOrEqual(13);
    }
});

it('les libellés des quotas ne sont jamais coupés : ni ellipse, ni ligne unique imposée, ni débordement masqué', () => {
    const quotaRules = allRules().filter(rule => /quota/.test(rule.selectorText));
    expect(quotaRules.length).toBeGreaterThan(0);
    for (const rule of quotaRules) {
        expect(rule.style.getPropertyValue('text-overflow'), rule.selectorText).toBe('');
        expect(rule.style.getPropertyValue('white-space'), rule.selectorText).not.toBe('nowrap');
        if (/quota-label/.test(rule.selectorText)) {
            expect(rule.style.getPropertyValue('overflow'), rule.selectorText).not.toBe('hidden');
            expect(rule.style.getPropertyValue('overflow-x'), rule.selectorText).not.toBe('hidden');
        }
    }
});

/** Règles d'une media query donnée, par sélecteur. */
const mediaRules = (condition: RegExp): CSSStyleRule[] => {
    const style = document.createElement('style');
    style.textContent = readFileSync('apps/web/src/styles.css', 'utf8');
    document.head.append(style);
    const result = Array.from(style.sheet!.cssRules).filter(rule => rule instanceof CSSMediaRule && condition.test(rule.media.mediaText))
        .flatMap(rule => Array.from((rule as CSSMediaRule).cssRules)).filter(rule => rule instanceof CSSStyleRule);
    style.remove();
    return result;
};

it('à partir de 1024 px de large, le panneau latéral grandit : texte d’au moins 15 px, cases du tampon d’au moins 64 px', () => {
    const wide = mediaRules(/min-width:\s*1024px/);
    expect(wide.length).toBeGreaterThan(0);
    const px = (value: string): number => value.endsWith('rem') ? Number.parseFloat(value) * 16 : Number.parseFloat(value);
    const rule = (selector: string): CSSStyleRule | undefined => wide.find(item => item.selectorText.split(/,\s*/).includes(selector));
    // Colonne du panneau assez large pour 64 px par case, marges comprises : 5 cases au plus en Classique et Expert,
    // 6 en Détente (une place de plus). L'écran de jeu porte le nombre de cases dans data-slots.
    const padding = px(rule('.tray')?.style.getPropertyValue('padding') ?? '0');
    const gap = px(rule('.buffer')?.style.getPropertyValue('gap') ?? '0');
    for (const slots of [3, 4, 5, 6]) {
        const columns = (rule(`.play[data-slots="${slots}"]`) ?? rule('.play'))?.style.getPropertyValue('grid-template-columns') ?? '';
        const tray = Number.parseFloat(/(\d+)px\s*$/.exec(columns)?.[1] ?? '0');
        expect(tray - 2 * padding - (slots - 1) * gap, `${slots} cases`).toBeGreaterThanOrEqual(slots * 64);
    }
    // Tout texte du panneau à 15 px au moins.
    for (const selector of ['.tray h2', '.quota', '.box-count', '.score']) {
        const size = rule(selector)?.style.getPropertyValue('font-size') ?? '';
        expect(px(size), `${selector} ${size}`).toBeGreaterThanOrEqual(15);
    }
    for (const item of wide) {
        const size = item.style.getPropertyValue('font-size');
        if (size) expect(px(size), `${item.selectorText} ${size}`).toBeGreaterThanOrEqual(15);
    }
});

it('l’interligne des libellés de quotas est un nombre entier de pixels, au-dessus de la zone de contenu de la police', () => {
    const label = allRules().filter(rule => rule.selectorText === '.quota-label');
    expect(label.map(rule => rule.style.getPropertyValue('line-height'))).toEqual(['var(--quota-line)']);
    // Chaque taille de police des quotas vient avec son interligne : entier, et au moins 1,17 em (DejaVu Sans : ~1,164 em).
    const sized = allRules().filter(rule => /(^|\s)\.quota$/.test(rule.selectorText) && rule.style.getPropertyValue('font-size'));
    expect(sized.length).toBeGreaterThan(0);
    for (const rule of sized) {
        const size = rule.style.getPropertyValue('font-size');
        const font = size.endsWith('rem') ? Number.parseFloat(size) * 16 : Number.parseFloat(size);
        const line = rule.style.getPropertyValue('--quota-line').trim();
        expect(line, rule.selectorText).toMatch(/^\d+px$/);
        expect(Number.parseFloat(line), `${rule.selectorText} ${size}`).toBeGreaterThanOrEqual(font * 1.17);
    }
});

it('à partir de 1024 px, les quotas tiennent sur une colonne, icônes bornées en hauteur', () => {
    const wide = mediaRules(/min-width:\s*1024px/);
    expect(wide.find(rule => rule.selectorText === '.quota-list[data-columns="2"]')?.style.getPropertyValue('flex-direction')).toBe('column');
    // happy-dom ne lit pas `min()` mêlé à `var()` : la déclaration est cherchée dans le texte du bloc.
    const css = readFileSync('apps/web/src/styles.css', 'utf8');
    const block = css.slice(css.indexOf('@media (min-width: 1024px)'));
    expect(block.slice(0, block.indexOf('\n}'))).toMatch(/\.quota-icon \{ width: min\(24px, 22px \* var\(--frame-ratio\)\)/);
});
