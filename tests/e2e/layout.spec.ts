import { expect, test } from '@playwright/test';
import { openLevel } from './helpers';

test.describe('petit téléphone', () => {
    test.use({ viewport: { width: 360, height: 640 } });

    for (const id of ['001-salon', '007-salon', '020-cuisine']) {
        test(`${id} : ni défilement horizontal, ni bouton ou carton hors de l'écran`, async ({ page }) => {
            await openLevel(page, id);
            expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
            for (const el of await page.locator('.topbar button:visible, .box, .box-pending, .slot').all()) {
                const box = await el.boundingBox();
                expect(box).not.toBeNull();
                if (!box) continue;
                expect(box.x).toBeGreaterThanOrEqual(0);
                expect(box.x + box.width).toBeLessThanOrEqual(360.5);
                expect(box.y + box.height).toBeLessThanOrEqual(640.5);
            }
        });
    }
});
