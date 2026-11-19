import { expect, test } from '@playwright/test';
import { capture, levelScreen, openLevel } from './helpers';

test.describe('panneau des quotas, petit téléphone', () => {
    test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });

    test('015 : le cadre des quotas affiché vient du panneau de la planche 04', async ({ page }) => {
        const errors = await openLevel(page, '015-salle-de-bain');
        const border = levelScreen(page).locator('.quotas .atlas-border');
        await expect(border).toHaveCount(1);
        await expect(border).toHaveAttribute('data-frame', 'sprite-panneau-quotas-sdb');
        await expect(border).toBeVisible();
        const slices = border.locator('.border-cell img');
        await expect(slices).toHaveCount(8);
        // Chaque tranche montre l'atlas du panneau de la salle de bain, chargé (précaché, donc aussi hors ligne).
        await expect.poll(() => slices.evaluateAll(images => images.every(image =>
            image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0 && /\/p04-quotas-[\w-]+\.webp$/.test(image.src)))).toBe(true);
        const box = (await border.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(390.5);
        await capture(page, 'quotas-salle-de-bain-390');
        expect(errors).toEqual([]);
    });

    test('001 : les autres pièces gardent le panneau de la planche 01', async ({ page }) => {
        await openLevel(page, '001-salon');
        await expect(levelScreen(page).locator('.quotas .atlas-border')).toHaveAttribute('data-frame', 'sprite-panneau-quotas');
    });
});
