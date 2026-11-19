import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import type { GameState } from '@cozy-room-sort/engine';
import { activeThemes } from '../../content/themes/index.ts';
import type { Level } from '@cozy-room-sort/schemas';

export const thirdRoom = activeThemes.find(theme => theme.id !== 'salon' && theme.id !== 'chambre')!;

export const levelFile = (id: string): Level => JSON.parse(readFileSync(`content/levels/${id}.json`, 'utf8')) as Level;
export const levelScreen = (page: Page) => page.getByTestId('ecran-jeu');

export async function openLevel(page: Page, id: string): Promise<string[]> {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`./?test=1#jeu/${id}`);
    await expect(levelScreen(page)).toHaveAttribute('data-level', id);
    await expect(levelScreen(page)).toHaveAttribute('data-ready', 'true', { timeout: 20_000 });
    return errors;
}

export const state = (page: Page): Promise<GameState> => page.evaluate(() => window.__cozy!.state());

export async function tapObject(page: Page, id: string): Promise<void> {
    const at = await page.evaluate(i => window.__cozy?.objectCenter(i) ?? null, id);
    if (!at) throw new Error(`objet absent de la scène : ${id}`);
    const before = (await state(page)).moveCount;
    if (test.info().project.use.hasTouch === true) await page.touchscreen.tap(at.x, at.y);
    else await page.mouse.click(at.x, at.y);
    await expect.poll(async () => (await state(page)).moveCount).toBe(before + 1);
}

export async function capture(page: Page, name: string): Promise<void> {
    await test.info().attach(name, { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
}
