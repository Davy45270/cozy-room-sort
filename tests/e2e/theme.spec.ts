import { expect, test } from '@playwright/test';
import { TOKENS } from '../../apps/web/src/theme/tokens.ts';
import { capture, thirdRoom } from './helpers';

const rgb = (hex: string): string => {
    const n = Number.parseInt(hex.slice(1), 16);
    return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

test.describe('système en sombre', () => {
    test.use({ colorScheme: 'dark' });

    test('le thème suit le système, et le réglage « Clair » l\'emporte', async ({ page }) => {
        await page.goto('./?test=0&demo=gagner');
        const home = page.getByTestId('ecran-accueil');
        await expect(home).toBeVisible();
        await expect(home.getByTestId('jouer').locator('[data-frame="sprite-btn-jouer"]')).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
        await expect(page.locator('body')).toHaveCSS('background-color', rgb(TOKENS.dark.bg));
        await capture(page, 'accueil-sombre');

        await home.getByRole('button', { name: 'Choisir un niveau' }).click();
        const levels = page.getByTestId('ecran-niveaux');
        await expect(levels).toBeVisible();
        await expect(page).toHaveURL(/#niveaux$/);
        await expect(levels.getByTestId('niveau-001-salon')).toBeEnabled();
        const room = levels.getByTestId(`onglet-${thirdRoom.id}`);
        await room.click();
        await expect(room).toHaveAttribute('aria-selected', 'true');
        await expect(levels.getByTestId(`niveau-015-${thirdRoom.id}`)).toBeVisible();
        await expect(levels.getByTestId('niveau-001-salon')).toBeHidden();
        await capture(page, `niveaux-${thirdRoom.id}`);

        await levels.getByRole('button', { name: 'Réglages' }).click();
        await expect(page.getByTestId('ecran-reglages')).toBeVisible();
        await expect(page).toHaveURL(/#reglages$/);
        await capture(page, 'réglages-sombre');
        await page.getByRole('radio', { name: 'Clair' }).check();
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
        await expect(page.locator('body')).toHaveCSS('background-color', rgb(TOKENS.light.bg));
        await page.reload();
        await expect(page.getByTestId('ecran-reglages')).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    });
});
