import { expect, test, type Page } from '@playwright/test';
import { capture, levelScreen, openLevel, state, thirdRoom } from './helpers';

test.describe('petit téléphone', () => {
    test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });

    test('les trois onglets gardent leurs vignettes lisibles et le niveau courant ressort', async ({ page }) => {
        await page.goto('./#niveaux');
        const levels = page.getByTestId('ecran-niveaux');
        const tabs = levels.getByRole('tab');
        await expect(tabs).toHaveCount(3);
        for (const tab of await tabs.all()) {
            const art = tab.locator('[data-frame^="sprite-choix-"], [data-frame^="derive-choix-"]');
            await expect(art).toBeVisible();
            expect((await art.boundingBox())!.width).toBeGreaterThanOrEqual(88);
        }
        const current = levels.getByTestId('niveau-001-salon');
        await expect(current).toHaveAttribute('aria-current', 'true');
        const star = current.locator('[data-frame="sprite-etoile"]').first();
        expect((await star.boundingBox())!.width).toBeGreaterThanOrEqual(20);
        await capture(page, 'niveaux-390');
    });

    test('la file montre les cartons actifs et ceux en attente', async ({ page }) => {
        await openLevel(page, '001-salon');
        const initial = await state(page);
        const queue = levelScreen(page).locator('.boxes');
        await expect(queue.locator('.box')).toHaveCount(initial.activeBoxIds.length + initial.pendingBoxIds.length);
        expect(initial.pendingBoxIds.length).toBeGreaterThan(0);
        for (const id of initial.activeBoxIds) {
            await expect(queue.locator(`[data-box="${id}"] [data-frame="sprite-carton-ouvert"]`)).toBeVisible();
        }
        for (const id of initial.pendingBoxIds) {
            const pending = queue.locator(`[data-box="${id}"].box-pending`);
            await expect(pending.locator('[data-frame="sprite-carton-ferme"]')).toBeVisible();
            await expect(pending.locator('.box-icon')).toBeVisible();
        }
    });

    for (const id of ['001-salon', '007-salon', `020-${thirdRoom.id}`]) {
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

for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 740 }]) {
    test.describe(`accueil à ${viewport.width}×${viewport.height}`, () => {
        test.use({ viewport });

        test('répartit le contenu sans grande bande vide', async ({ page }) => {
            await page.goto('./');
            const home = page.getByTestId('ecran-accueil');
            const title = home.getByRole('heading', { level: 1 });
            await expect(title).toBeFocused();
            await expect(title).toHaveCSS('outline-style', 'none');
            const view = home.locator('[data-frame="sprite-vue-salon"]');
            await expect(view).toBeVisible();
            const hero = (await view.boundingBox())!;
            expect(hero.width).toBeGreaterThanOrEqual(300);
            const choices = home.locator('.home-rooms .room-choice > .atlas-frame');
            await expect(choices).toHaveCount(3);
            const elements = [title, view, ...await choices.all(), home.getByTestId('jouer'),
                home.getByRole('button', { name: 'Choisir un niveau' }), home.getByRole('button', { name: 'Réglages' })];
            let bottom = 0;
            const rows = await Promise.all(elements.map(async el => (await el.boundingBox())!));
            for (const box of rows.sort((a, b) => a.y - b.y)) {
                expect(box.y - bottom).toBeLessThanOrEqual(viewport.height * .15);
                expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + .5);
                bottom = Math.max(bottom, box.y + box.height);
            }
            expect(viewport.height - bottom).toBeLessThanOrEqual(viewport.height * .15);
            await capture(page, `accueil-${viewport.width}`);
        });
    });
}

async function expectReadableText(page: Page): Promise<void> {
    const small = await page.evaluate(() => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const range = document.createRange();
        const violations: { text: string; size: string }[] = [];
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const text = node.textContent?.trim();
            const parent = node.parentElement;
            if (!text || !parent) continue;
            const style = getComputedStyle(parent);
            if (style.visibility !== 'visible') continue;
            const clipped = parent.closest('.sr-only');
            if (clipped && getComputedStyle(clipped).getPropertyValue('clip') !== 'auto') continue;
            range.selectNodeContents(node);
            if (![...range.getClientRects()].some(rect => rect.width > 0 && rect.height > 0)) continue;
            if (parseFloat(style.fontSize) < 14) violations.push({ text, size: style.fontSize });
        }
        return violations;
    });
    expect(small).toEqual([]);
}

test.describe('texte à 360×740', () => {
    test.use({ viewport: { width: 360, height: 740 }, reducedMotion: 'reduce' });

    test('le texte visible fait au moins 14 px sur chaque écran', async ({ page }) => {
        await page.goto('./');
        const home = page.getByTestId('ecran-accueil');
        await expect(home).toBeVisible();
        await expectReadableText(page);
        await home.getByRole('button', { name: 'Choisir un niveau' }).click();
        const levels = page.getByTestId('ecran-niveaux');
        await expect(levels).toBeVisible();
        await expectReadableText(page);
        await levels.getByRole('button', { name: 'Réglages' }).click();
        await expect(page.getByTestId('ecran-reglages')).toBeVisible();
        await expectReadableText(page);
        await openLevel(page, `020-${thirdRoom.id}`);
        await expectReadableText(page);
        await capture(page, 'partie-360');
        await levelScreen(page).getByRole('button', { name: 'Accueil' }).click();
        await expect(home.locator(`[data-frame="sprite-${thirdRoom.vue}"]`)).toBeVisible();
        await page.goto('./?test=1&demo=gagner');
        await expect(page.getByTestId('ecran-victoire')).toBeVisible();
        await expectReadableText(page);
        await capture(page, 'victoire-360');
    });
});

test.describe('bureau à 1280×800', () => {
    test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, deviceScaleFactor: 1 });

    test('l’accueil répartit la vue et les actions sur deux colonnes', async ({ page }) => {
        await page.goto('./');
        const home = page.getByTestId('ecran-accueil');
        const view = home.locator('[data-frame="sprite-vue-salon"]');
        await expect(view).toBeVisible();
        const hero = (await view.boundingBox())!;
        const menu = (await home.locator('.home-menu').boundingBox())!;
        expect(hero.x + hero.width).toBeLessThan(menu.x);
        await capture(page, 'accueil-1280');
        await openLevel(page, `020-${thirdRoom.id}`);
        const tray = (await levelScreen(page).locator('.tray').boundingBox())!;
        const room = (await levelScreen(page).locator('.room').boundingBox())!;
        expect(tray.height).toBeLessThan(room.height * .8);
        await capture(page, 'partie-1280');
    });
});

for (const viewport of [{ width: 1280, height: 800 }, { width: 360, height: 740 }]) {
    test.describe(`pièce entière à ${viewport.width}×${viewport.height}`, () => {
        test.use({ viewport, reducedMotion: 'reduce' });

        for (const id of [`015-${thirdRoom.id}`, `020-${thirdRoom.id}`]) {
            test(`${id} : l’hexagone de la vue tient entier dans la fenêtre`, async ({ page }) => {
                await openLevel(page, id);
                const view = await page.evaluate(() => window.__cozy!.viewBounds());
                expect(view).not.toBeNull();
                expect(view!.x).toBeGreaterThanOrEqual(0);
                expect(view!.y).toBeGreaterThanOrEqual(0);
                expect(view!.x + view!.width).toBeLessThanOrEqual(viewport.width);
                expect(view!.y + view!.height).toBeLessThanOrEqual(viewport.height);
                await capture(page, `vue-${id}-${viewport.width}`);
            });
        }
    });
}

for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 740 }]) {
    test.describe(`écran de jeu à ${viewport.width}×${viewport.height}`, () => {
        test.use({ viewport, reducedMotion: 'reduce' });

        test('la pièce se colle sous l’en-tête sur toute la largeur, le panneau prend le reste sans bande vide', async ({ page }) => {
            await openLevel(page, '001-salon');
            const screen = levelScreen(page);
            const header = (await screen.locator('.topbar').boundingBox())!;
            const view = (await page.evaluate(() => window.__cozy!.viewBounds()))!;
            const tray = (await screen.locator('.tray').boundingBox())!;
            if (viewport.width === 390) {
                expect(view.x).toBeLessThanOrEqual(viewport.width * .02);
                expect(viewport.width - view.x - view.width).toBeLessThanOrEqual(viewport.width * .02);
            }
            expect(view.y - (header.y + header.height)).toBeLessThanOrEqual(40);
            expect(tray.y - (view.y + view.height)).toBeLessThanOrEqual(40);
            expect(tray.y + tray.height).toBeLessThanOrEqual(viewport.height + .5);
            // Dans le panneau : aucun bloc séparé du précédent, ni du bas de l'écran, par plus de 40 px.
            let bottom = tray.y;
            const blocks = await Promise.all(['.box-area', '.quotas', '.buffer-wrap h2', '.buffer', '.score']
                .map(async selector => (await screen.locator(selector).first().boundingBox())!));
            for (const block of blocks.sort((a, b) => a.y - b.y)) {
                expect(block.y - bottom).toBeLessThanOrEqual(40);
                bottom = Math.max(bottom, block.y + block.height);
            }
            expect(viewport.height - bottom).toBeLessThanOrEqual(40);
            // Les éléments du panneau grandissent : cartons jusqu'à 88 px, cases de 52 px, quotas en 16 px.
            for (const picture of await screen.locator('.box-picture').all()) {
                expect((await picture.boundingBox())!.width).toBeLessThanOrEqual(88.5);
            }
            if (viewport.width === 390) expect((await screen.locator('.box-picture').first().boundingBox())!.width).toBeGreaterThanOrEqual(80);
            for (const slot of await screen.locator('.slot').all()) expect((await slot.boundingBox())!.height).toBeGreaterThanOrEqual(52);
            await expect(screen.locator('.quota').first()).toHaveCSS('font-size', '16px');
            // Cadre des quotas : les bords de la planche, sans le cadre entier ni son centre.
            const border = screen.locator('.quotas .atlas-border[data-frame="sprite-panneau-quotas"]');
            await expect(border).toBeVisible();
            await expect(border.locator('.border-cell')).toHaveCount(8);
            await expect(screen.locator('.quotas .atlas-frame[data-frame="sprite-panneau-quotas"]')).toHaveCount(0);
            const images = await page.evaluate(() => window.__cozy!.images());
            expect(images.find(image => image.id === 'fond')).toMatchObject({ frame: 'sprite-vue-salon', visible: true, alpha: 1 });
            expect(images.find(image => image.id === 'chat')).toMatchObject({ frame: 'sprite-chat-dort', visible: true, alpha: 1 });
            await capture(page, `jeu-salon-${viewport.width}x${viewport.height}`);
        });
    });
}

test.describe('fondu du bas de la vue', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('est dans la scène, entre la vue et les objets, pour la salle de bain seulement', async ({ page }) => {
        await openLevel(page, '001-salon');
        await expect(page.locator('.view-fade')).toHaveCount(0);
        expect((await page.evaluate(() => window.__cozy!.images())).some(image => image.id === 'fondu')).toBe(false);
        const id = `015-${thirdRoom.id}`;
        await openLevel(page, id);
        await expect(page.locator('.view-fade')).toHaveCount(0);
        const images = await page.evaluate(() => window.__cozy!.images());
        const fade = images.find(image => image.id === 'fondu');
        if (thirdRoom.vue_fondu_bas === undefined) { expect(fade).toBeUndefined(); return; }
        const fond = images.find(image => image.id === 'fond')!;
        expect(fade).toMatchObject({ visible: true, alpha: 1 });
        expect(fade!.depth).toBeGreaterThan(fond.depth);
        for (const other of images.filter(image => image.id !== 'fond' && image.id !== 'fondu')) expect(other.depth, other.id).toBeGreaterThan(fade!.depth);
        // Mouvement non réduit : l'objet touché part en vol et reste au-dessus du fondu pendant tout son trajet.
        // Toucher et relevé dans la même tâche : le vol dure 180 ms.
        const flight = await page.evaluate(() => {
            const hooks = window.__cozy!;
            const first = hooks.solution()[0]!;
            hooks.tapObject(first);
            return hooks.images().find(image => image.id === first && image.flying) ?? null;
        });
        expect(flight).not.toBeNull();
        expect(flight!.depth).toBeGreaterThan(fade!.depth);
        await capture(page, `fondu-${id}`);
    });
});
