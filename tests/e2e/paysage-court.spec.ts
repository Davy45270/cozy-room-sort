import { expect, test } from '@playwright/test';
import { capture, openLevel } from './helpers';

// Paysage court (téléphone couché, petite fenêtre) : le panneau latéral reste dans sa ligne, sous l'en-tête et dans la
// fenêtre ; ce qui ne tient pas défile DANS le panneau, jamais sous l'en-tête ni hors de l'écran.
for (const [w, h] of [[1024, 400], [844, 390], [1280, 600]] as const) {
    test.describe(`${w} × ${h}`, () => {
        test.use({ viewport: { width: w, height: h } });
        for (const id of ['001-salon', '007-salon', '020-salle-de-bain']) {
            test(`${id} : le panneau tient entre l’en-tête et le bas de la fenêtre`, async ({ page }) => {
                await openLevel(page, id);
                const m = await page.evaluate(() => {
                    const tray = document.querySelector('.tray')!;
                    const box = (e: Element) => e.getBoundingClientRect();
                    return {
                        header: box(document.querySelector('.topbar')!).bottom, tray: box(tray), vh: innerHeight,
                        page: document.scrollingElement!.scrollHeight,
                        scrolls: tray.scrollHeight <= tray.clientHeight + 1 || ['auto', 'scroll'].includes(getComputedStyle(tray).overflowY)
                    };
                });
                expect(m.tray.top).toBeGreaterThanOrEqual(m.header - 0.5);
                expect(m.tray.bottom).toBeLessThanOrEqual(m.vh + 0.5);
                expect(m.page).toBeLessThanOrEqual(m.vh);
                expect(m.scrolls).toBe(true);
                // La dernière case du tampon s'atteint en faisant défiler le panneau.
                const last = page.locator('.tray .buffer .slot').last();
                await last.scrollIntoViewIfNeeded();
                await expect(last).toBeInViewport();
            });
        }
    });
}

// Portrait tactile : la règle paysage ne s'applique pas ; le panneau ne défile pas en lui-même (aucun défilement
// imbriqué ne prend le geste de glisser) et la dernière case du tampon est à l'écran sans rien faire défiler.
test.describe('390 × 844 portrait tactile', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    for (const id of ['001-salon', '007-salon', '020-salle-de-bain']) {
        test(`${id} : la dernière case du tampon est à l’écran, sans défilement imbriqué`, async ({ page }) => {
            await openLevel(page, id);
            const m = await page.evaluate(() => {
                const tray = document.querySelector('.tray')!;
                return { overflow: getComputedStyle(tray).overflowY, inner: tray.scrollHeight - tray.clientHeight, page: document.scrollingElement!.scrollHeight, vh: innerHeight };
            });
            expect(m.overflow).toBe('visible');
            expect(m.inner).toBeLessThanOrEqual(1);
            expect(m.page).toBeLessThanOrEqual(m.vh);
            await expect(page.locator('.tray .buffer .slot').last()).toBeInViewport({ ratio: 1 });
        });
    }
});

test.describe('844 × 390 capture', () => {
    test.use({ viewport: { width: 844, height: 390 } });
    test('020-salle-de-bain en paysage court : capture pour relecture', async ({ page }) => {
        await openLevel(page, '020-salle-de-bain');
        await capture(page, 'paysage-844x390-020-salle-de-bain');
        await page.locator('.tray').evaluate(e => { e.scrollTop = e.scrollHeight; });
        await capture(page, 'paysage-844x390-020-salle-de-bain-panneau-en-bas');
    });
});
