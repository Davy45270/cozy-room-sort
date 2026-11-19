import { expect, test } from '@playwright/test';
import { BLOCKED_LEVEL, BLOCKED_MOVES } from '../../apps/web/src/test-hooks.ts';
import { capture, levelFile, levelScreen, openLevel, state, tapObject } from './helpers';

test('gagner le premier niveau en suivant la meilleure solution donne trois étoiles', async ({ page }) => {
    const errors = await openLevel(page, '001-salon');
    const screen = levelScreen(page);
    const guide = screen.locator('[data-frame="sprite-case-tampon-aide"]');
    const progress = screen.getByRole('progressbar', { name: 'Objets rangés' });
    await expect(guide).toHaveCount(1);
    await expect(progress).toHaveAttribute('aria-valuenow', '0');
    const level = levelFile('001-salon');
    for (const id of level.meta?.solution ?? []) await tapObject(page, id);
    const dialog = page.getByTestId('ecran-victoire');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('img', { name: '3 étoiles sur 3' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Niveau suivant' }).locator('[data-frame="sprite-btn-jouer"]')).toBeVisible();
    await expect(screen.locator('[data-frame="sprite-carton-ferme"]')).toHaveCount(level.boxes.length);
    await expect(screen.locator('[data-frame="sprite-coche"]')).toHaveCount(level.categories.length);
    await expect(screen.locator('.progress')).toHaveAttribute('aria-valuenow', String(level.objects.length));
    await expect(guide).toHaveCount(0);
    expect(errors).toEqual([]);
    await capture(page, 'victoire');

    await page.goto('./?test=1&demo=gagner');
    await expect(dialog).toBeVisible();
    expect((await state(page)).moveCount).toBe(level.objects.length);
});

test('annuler rend au tampon l\'état d\'avant', async ({ page }) => {
    await openLevel(page, '004-salon');
    const redo = page.getByRole('button', { name: 'Refaire le dernier coup' });
    await expect(redo).toBeDisabled();
    for (const id of levelFile('004-salon').meta?.solution ?? []) {
        const before = await state(page);
        await tapObject(page, id);
        const after = await state(page);
        if (after.bufferedCount <= before.bufferedCount) continue;
        await expect(page.locator('.buffer .slot-full')).toHaveCount(before.bufferObjectIds.length + 1);
        await page.getByRole('button', { name: 'Annuler le dernier coup' }).click();
        await expect.poll(async () => (await state(page)).bufferObjectIds).toEqual(before.bufferObjectIds);
        await expect(page.locator('.buffer .slot-full')).toHaveCount(before.bufferObjectIds.length);
        await expect(redo).toBeEnabled();
        await redo.click();
        await expect.poll(async () => (await state(page)).bufferObjectIds).toEqual(after.bufferObjectIds);
        await expect(redo).toBeDisabled();
        return;
    }
    throw new Error('aucun passage au tampon dans la solution');
});

test('un objet bloqué ne réagit pas', async ({ page }) => {
    const level = levelFile(BLOCKED_LEVEL);
    await openLevel(page, level.id);
    const blocked = level.objects.find(o => o.blockedBy.length > 0);
    if (!blocked) throw new Error('niveau sans objet bloqué');
    const before = await state(page);
    await page.evaluate(id => window.__cozy?.tapObject(id), blocked.id);
    expect((await state(page)).moveCount).toBe(before.moveCount);
    await expect(page.getByRole('navigation', { name: 'Objets à portée' }).locator(`[data-object="${blocked.id}"]`)).toHaveCount(0);

    await page.goto('./?test=1&demo=bloquer');
    const stuck = page.getByTestId('ecran-bloque');
    await expect(stuck).toBeVisible();
    expect((await state(page)).moveCount).toBe(BLOCKED_MOVES.length);
    await expect(stuck.getByRole('button', { name: 'Annuler' })).toBeEnabled();
    await expect(stuck.getByRole('button', { name: 'Recommencer' })).toBeEnabled();
    await capture(page, 'bloqué');

    await openLevel(page, level.id);
    await page.getByRole('button', { name: 'Réglages' }).click();
    await expect(page.getByTestId('ecran-reglages')).toBeVisible();
    await page.getByRole('radio', { name: /Expert/ }).check();
    await page.getByRole('button', { name: 'Retour' }).click();
    await expect(levelScreen(page)).toHaveAttribute('data-ready', 'true');
    for (const id of BLOCKED_MOVES) await tapObject(page, id);
    const lost = page.getByTestId('ecran-perdu');
    await expect(lost).toBeVisible();
    await expect(lost.getByRole('button', { name: 'Recommencer' })).toBeEnabled();
    await expect(lost.getByRole('button', { name: 'Annuler' })).toHaveCount(0);
    await capture(page, 'perdu');
});

test('on joue au clavier par la liste des objets à portée', async ({ page }) => {
    await openLevel(page, '001-salon');
    const first = (levelFile('001-salon').meta?.solution ?? [])[0] as string;
    const button = page.locator(`.reachable [data-object="${first}"]`);
    await button.focus();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await state(page)).moveCount).toBe(1);
    await expect(page.locator('.reachable button:focus')).toHaveCount(1);
});
