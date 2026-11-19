import { expect, test } from '@playwright/test';
import { levelFile, levelScreen, openLevel, state } from './helpers';

/** Écrit une partie en cours telle que l'enregistrait une version précédente du jeu : sans empreinte du niveau. */
async function writeLegacySave(page: import('@playwright/test').Page, levelId: string, rulesVersion: string, actions: unknown[]): Promise<void> {
    await page.evaluate(async ({ levelId, rulesVersion, actions }) => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open('cozy-room-sort', 1);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error ?? new Error('IndexedDB indisponible'));
        });
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction('saves', 'readwrite');
            tx.objectStore('saves').put({ levelId, rulesVersion, actions }, levelId);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error ?? new Error('écriture IndexedDB en échec'));
        });
        db.close();
    }, { levelId, rulesVersion, actions });
}

test('une partie enregistrée pour une autre version du niveau reprend au début et le jeu l’annonce', async ({ page }) => {
    const id = '002-salon';
    const level = levelFile(id);
    await openLevel(page, id);
    await writeLegacySave(page, id, level.rulesVersion, [{ type: 'SELECT_OBJECT', objectId: 'livre-1' }]);
    await page.reload();
    await expect(levelScreen(page)).toHaveAttribute('data-ready', 'true', { timeout: 20_000 });
    expect((await state(page)).moveCount).toBe(0);
    await expect(levelScreen(page).locator('[role="status"]')).toHaveText('Ce niveau a changé : la partie reprend au début.');
});

test('une partie sans empreinte, même encore rejouable sur le niveau actuel, reprend au début et le jeu l’annonce', async ({ page }) => {
    const id = '002-salon';
    const level = levelFile(id);
    const first = level.meta?.solution?.[0];
    expect(first).toBe('pile-8');
    await openLevel(page, id);
    await writeLegacySave(page, id, level.rulesVersion, [{ type: 'SELECT_OBJECT', objectId: first }]);
    await page.reload();
    await expect(levelScreen(page)).toHaveAttribute('data-ready', 'true', { timeout: 20_000 });
    expect((await state(page)).moveCount).toBe(0);
    await expect(levelScreen(page).locator('[role="status"]')).toHaveText('Ce niveau a changé : la partie reprend au début.');
});
