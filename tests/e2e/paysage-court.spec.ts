import { expect, test } from '@playwright/test';
import { openLevel } from './helpers';

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
