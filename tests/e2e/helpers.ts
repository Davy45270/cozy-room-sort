import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import type { GameState } from '@cozy-room-sort/engine';
import type { Level } from '@cozy-room-sort/schemas';

declare global { interface Window { __cozy?: { objectCenter(id: string): { x: number; y: number } | null; state(): GameState; solution(): readonly string[]; tapObject(id: string): void } } }

export const levelFile = (id: string): Level => JSON.parse(readFileSync(`content/levels/${id}.json`, 'utf8')) as Level;

/** Ouvre un niveau en mode test et attend que la scène soit prête ; rend la liste des erreurs de page. */
export async function openLevel(page: Page, id: string): Promise<string[]> {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`./?test=1#${id}`);
    await expect(page.locator(`main.play[data-level="${id}"][data-ready="true"]`)).toBeVisible({ timeout: 20_000 });
    return errors;
}

export const state = (page: Page): Promise<GameState> => page.evaluate(() => (window.__cozy as NonNullable<Window['__cozy']>).state());

/** Touche un objet là où la scène le dessine : au doigt sur un profil tactile (WebKit iPhone n'envoie pas la souris à Phaser), sinon à la souris. */
export async function tapObject(page: Page, id: string): Promise<void> {
    const at = await page.evaluate(i => window.__cozy?.objectCenter(i) ?? null, id);
    if (!at) throw new Error(`objet absent de la scène : ${id}`);
    const before = (await state(page)).moveCount;
    if (test.info().project.use.hasTouch === true) await page.touchscreen.tap(at.x, at.y);
    else await page.mouse.click(at.x, at.y);
    await expect.poll(async () => (await state(page)).moveCount).toBe(before + 1);
}
