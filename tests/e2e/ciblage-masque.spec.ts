import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { layoutRoom, type Bounds } from '../../apps/web/src/scene/layout.ts';
import { usefulBox } from '@cozy-room-sort/schemas/room-geometry';
import { levelFile, openLevel, state } from './helpers';

// Ciblage au toucher sur l'état initial de 007-salon. Les points sont relevés dans une zone de jeu de
// 390 × 390 px en portrait étroit, puis ramenés à l'écran du projet par la similitude que donnent les centres
// de deux objets (la pièce, ses objets et leurs tailles sont tous proportionnels à la vue).
const LEVEL = '007-salon';
const REFERENCE = { width: 390, height: 390, compact: true };

interface Provenance { id: string; dimensions: { w: number; h: number }; hitbox: { x: number; y: number; w: number; h: number } }
const provenance = new Map((JSON.parse(readFileSync('content/assets/provenance.json', 'utf8')) as Provenance[]).map(entry => [entry.id, entry]));
const boundsOf = (asset: string): Bounds => {
    const { dimensions: d, hitbox: b } = provenance.get(asset)!;
    return { x: b.x / d.w, y: b.y / d.h, w: b.w / d.w, h: b.h / d.h };
};

const level = levelFile(LEVEL);
const placed = layoutRoom(level, REFERENCE);
function referenceCenter(id: string): { x: number; y: number } {
    const object = level.objects.find(item => item.id === id)!;
    const box = usefulBox(placed.get(id)!, boundsOf(object.asset));
    return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

async function toScreen(page: Page, point: { x: number; y: number }, a: string, b: string): Promise<{ x: number; y: number }> {
    const [sa, sb] = await page.evaluate(ids => ids.map(id => window.__cozy!.objectCenter(id)), [a, b]);
    if (!sa || !sb) throw new Error('objet de repère absent de la scène');
    const ra = referenceCenter(a);
    const rb = referenceCenter(b);
    const scale = Math.hypot(sb.x - sa.x, sb.y - sa.y) / Math.hypot(rb.x - ra.x, rb.y - ra.y);
    return { x: sa.x + (point.x - ra.x) * scale, y: sa.y + (point.y - ra.y) * scale };
}

async function touch(page: Page, at: { x: number; y: number }): Promise<void> {
    if (test.info().project.use.hasTouch === true) await page.touchscreen.tap(at.x, at.y);
    else await page.mouse.click(at.x, at.y);
}

const inRoom = async (page: Page, id: string): Promise<boolean> =>
    (await page.evaluate(() => window.__cozy!.images())).some(image => image.id === id && !image.flying);

test('toucher la partie visible d\'un objet masqué ne joue pas l\'objet qui le masque', async ({ page }) => {
    // pile-4 (cadre masqué, bloqué par pile-42) est le seul objet opaque en (113, 238) : alpha de l'atlas relevé
    // sur 47 des 81 pixels autour du point. La boîte utile de pile-42 est à moins de 3 px, dans le rattrapage.
    // Le cas d'origine de la revue, (122, 284), tombe aussi sur pile-4 mais sur un liseré de 4 pixels sur 49 :
    // trop fragile une fois l'échelle changée, on garde le même cas sur une partie plus large du cadre.
    expect(level.objects.find(o => o.id === 'pile-4')?.blockedBy).toEqual(['pile-42']);
    await openLevel(page, LEVEL);
    const at = await toScreen(page, { x: 113, y: 238 }, 'pile-4', 'pile-6');
    await touch(page, at);
    await page.waitForTimeout(600);
    expect((await state(page)).moveCount).toBe(0);
    expect(await inRoom(page, 'pile-42')).toBe(true);
    expect(await inRoom(page, 'pile-4')).toBe(true);
});

test('témoin : le rattrapage de 22 px joue l\'objet accessible voisin d\'une zone vide', async ({ page }) => {
    // (162, 178) ne touche aucun pixel opaque ; la boîte utile la plus proche est celle de pile-6, accessible,
    // à 8,5 px ; la suivante est à 13,6 px.
    expect(level.objects.find(o => o.id === 'pile-6')?.blockedBy).toEqual([]);
    await openLevel(page, LEVEL);
    const at = await toScreen(page, { x: 162, y: 178 }, 'pile-4', 'pile-6');
    await touch(page, at);
    await expect.poll(async () => (await state(page)).moveCount).toBe(1);
    await expect.poll(() => inRoom(page, 'pile-6')).toBe(false);
});
