import { expect, test } from '@playwright/test';
import { levelFile, openLevel, state } from './helpers';

// Le panneau latéral défile en paysage court : un objet qui part au tampon vole vers une case qui doit être dans la
// zone visible du panneau à la fin du vol (le panneau défile jusqu'à elle), sans que la page elle-même défile.
const cas = [
    { id: '020-salle-de-bain', width: 844, height: 390 },
    { id: '001-salon', width: 1024, height: 300 }
] as const;

for (const { id, width, height } of cas) {
    test.describe(`${width} × ${height}`, () => {
        test.use({ viewport: { width, height } });
        test(`${id} : la case de destination du tampon est visible dans le panneau à la fin du vol`, async ({ page }) => {
            await openLevel(page, id);
            const level = levelFile(id);
            const actives = new Set(level.boxes.slice(0, level.rules.activeBoxCount).map(b => b.category));
            const candidats = level.objects.filter(o => o.blockedBy.length === 0 && !actives.has(o.category)).map(o => o.id);
            let joue: string | undefined;
            for (const objet of candidats) {
                const avant = (await state(page)).moveCount;
                await page.evaluate(o => window.__cozy!.tapObject(o), objet);
                if ((await state(page)).moveCount === avant + 1) { joue = objet; break; }
            }
            expect(joue, 'un objet accessible part au tampon').toBeDefined();
            expect((await state(page)).bufferObjectIds).toContain(joue);
            await page.waitForTimeout(800);
            const m = await page.evaluate(o => {
                const tray = document.querySelector('.tray')!.getBoundingClientRect();
                const slot = document.querySelector(`[data-buffer-object="${o}"]`)!.getBoundingClientRect();
                return { trayTop: tray.top, trayBottom: tray.bottom, slotTop: slot.top, slotBottom: slot.bottom, y: scrollY, page: document.scrollingElement!.scrollHeight, vh: innerHeight };
            }, joue!);
            expect(m.slotTop).toBeGreaterThanOrEqual(m.trayTop - 0.5);
            expect(m.slotBottom).toBeLessThanOrEqual(m.trayBottom + 0.5);
            // Contre-épreuve : seule la zone du panneau a défilé, pas la page.
            expect(m.y).toBe(0);
            expect(m.page).toBeLessThanOrEqual(m.vh);
        });
    });
}
