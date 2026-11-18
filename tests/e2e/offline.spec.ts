import { expect, test } from '@playwright/test';
import { levelFile, openLevel, state, tapObject } from './helpers';

test('hors ligne, la page s\'ouvre et la partie reprend au même coup', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'service worker hors ligne vérifié sur Chromium');
    await openLevel(page, '002-salon');
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    for (const id of (levelFile('002-salon').meta?.solution ?? []).slice(0, 2)) await tapObject(page, id);
    const before = await state(page);
    await page.waitForTimeout(300);
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('main.play[data-level="002-salon"][data-ready="true"]')).toBeVisible({ timeout: 20_000 });
    const after = await state(page);
    expect(after.moveCount).toBe(2);
    expect(after.remainingObjectIds).toEqual(before.remainingObjectIds);
});
