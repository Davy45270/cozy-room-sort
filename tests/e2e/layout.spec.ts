import { expect, test } from '@playwright/test';
import { capture, levelScreen, openLevel } from './helpers';

test.describe('petit téléphone', () => {
    test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });

    for (const id of ['001-salon', '007-salon', '020-salle-de-bain']) {
        test(`${id} : ni défilement horizontal, ni bouton ou carton hors de l'écran`, async ({ page }) => {
            await openLevel(page, id);
            expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
            for (const el of await levelScreen(page).locator('.topbar button:visible, .box, .slot').all()) {
                const box = await el.boundingBox();
                expect(box).not.toBeNull();
                if (!box) continue;
                expect(box.x).toBeGreaterThanOrEqual(0);
                expect(box.x + box.width).toBeLessThanOrEqual(390.5);
                expect(box.y + box.height).toBeLessThanOrEqual(844.5);
                if (await el.evaluate(node => node.tagName === 'BUTTON')) {
                    expect(box.width).toBeGreaterThanOrEqual(44);
                    expect(box.height).toBeGreaterThanOrEqual(44);
                }
            }
            await capture(page, `partie-${id}`);
        });
    }
});
