import { expect, test } from '@playwright/test';
import { levelFile, openLevel, state, tapObject } from './helpers';

test('gagner le premier niveau en suivant la meilleure solution donne trois étoiles', async ({ page }) => {
    const errors = await openLevel(page, '001-salon');
    for (const id of levelFile('001-salon').meta?.solution ?? []) await tapObject(page, id);
    const dialog = page.getByRole('dialog', { name: 'Pièce rangée !' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('img', { name: '3 étoiles sur 3' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Niveau suivant' })).toBeVisible();
    expect(errors).toEqual([]);
});

test('annuler rend au tampon l\'état d\'avant', async ({ page }) => {
    await openLevel(page, '004-salon');
    for (const id of levelFile('004-salon').meta?.solution ?? []) {
        const before = await state(page);
        await tapObject(page, id);
        if ((await state(page)).bufferedCount > before.bufferedCount) {
            await expect(page.locator('.buffer .slot-full')).toHaveCount(before.bufferObjectIds.length + 1);
            await page.getByRole('button', { name: 'Annuler le dernier coup' }).click();
            await expect.poll(async () => (await state(page)).bufferObjectIds).toEqual(before.bufferObjectIds);
            await expect(page.locator('.buffer .slot-full')).toHaveCount(before.bufferObjectIds.length);
            return;
        }
    }
    throw new Error('aucun passage au tampon dans la solution');
});

test('un objet bloqué ne réagit pas', async ({ page }) => {
    const level = levelFile('004-salon');
    await openLevel(page, level.id);
    const blocked = level.objects.find(o => o.blockedBy.length > 0);
    if (!blocked) throw new Error('niveau sans objet bloqué');
    const before = await state(page);
    await page.evaluate(id => window.__cozy?.tapObject(id), blocked.id);
    await page.waitForTimeout(250);
    expect((await state(page)).moveCount).toBe(before.moveCount);
    await expect(page.getByRole('navigation', { name: 'Objets à portée' }).locator(`[data-object="${blocked.id}"]`)).toHaveCount(0);
});

test('on joue au clavier par la liste des objets à portée', async ({ page }) => {
    await openLevel(page, '001-salon');
    const first = (levelFile('001-salon').meta?.solution ?? [])[0] as string;
    const button = page.locator(`.reachable [data-object="${first}"]`);
    await button.focus();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await state(page)).moveCount).toBe(1);
});
