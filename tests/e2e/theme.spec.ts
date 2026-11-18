import { expect, test } from '@playwright/test';
import { TOKENS } from '../../apps/web/src/theme/tokens';

const rgb = (hex: string): string => {
    const n = Number.parseInt(hex.slice(1), 16);
    return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

test.describe('système en sombre', () => {
    test.use({ colorScheme: 'dark' });

    test('le thème suit le système, et le réglage « Clair » l\'emporte', async ({ page }) => {
        await page.goto('./?test=1');
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
        await expect(page.locator('body')).toHaveCSS('background-color', rgb(TOKENS.dark.bg));
        await page.getByRole('button', { name: 'Réglages' }).click();
        await page.getByRole('radio', { name: 'Clair' }).check();
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
        await expect(page.locator('body')).toHaveCSS('background-color', rgb(TOKENS.light.bg));
        await page.reload();
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    });
});
