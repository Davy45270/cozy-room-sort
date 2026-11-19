import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { levelFile } from './helpers';

test.use({ viewport: { width: 390, height: 844 } });

test('T20 : fréquence des images, chargement après cache et latence d’un rangement', async ({ page, context }, info) => {
    test.skip(info.project.name !== 'chromium-mobile', 'mesure de référence sur Chromium mobile');

    const id = '001-salon';
    const url = `./?test=1#jeu/${id}`;
    const game = '[data-testid="ecran-jeu"]';
    const ready = `${game}[data-ready="true"]`;
    await page.goto(url);
    await page.locator(ready).waitFor();
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    await page.close();

    const cached = await context.newPage();
    await context.setOffline(true);
    const start = performance.now();
    await cached.goto(url, { waitUntil: 'commit' });
    await cached.locator(ready).waitFor();
    const chargement_ms = performance.now() - start;
    expect(await cached.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

    // Profil de référence de la spec (« mobile milieu de gamme ») : processeur ralenti 4 fois, comme le profil mobile
    // de Lighthouse. La fréquence est la médiane des intervalles entre images ; 60 FPS = une image par période de
    // rafraîchissement de 60 Hz (16,67 ms), à la résolution de l'horloge près (0,1 ms).
    const cdp = await context.newCDPSession(cached);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const medianFrameMs = await cached.evaluate(() => new Promise<number>(resolve => {
        const durations: number[] = [];
        requestAnimationFrame(first => {
            let previous = first;
            const sample = (timestamp: number): void => {
                durations.push(timestamp - previous);
                previous = timestamp;
                if (timestamp - first < 3000) {
                    requestAnimationFrame(sample);
                    return;
                }
                durations.sort((a, b) => a - b);
                const middle = Math.floor(durations.length / 2);
                const median = (durations[middle]! + durations[Math.floor((durations.length - 1) / 2)]!) / 2;
                resolve(median);
            };
            requestAnimationFrame(sample);
        });
    }));

    const fps = 1000 / medianFrameMs;
    const firstMove = levelFile(id).meta!.solution![0]!;
    const point = await cached.evaluate(objectId => window.__cozy?.objectCenter(objectId), firstMove);
    if (!point) throw new Error('Premier objet accessible absent de la scène');
    await cached.evaluate(() => {
        const game = document.querySelector<HTMLElement>('[data-testid="ecran-jeu"]')!;
        const counts = (): string => [...game.querySelectorAll('.box-count, .buffer')]
            .map(node => node.matches('.buffer') ? node.getAttribute('aria-label') : node.textContent).join('|');
        const before = counts();
        let clickedAt: number | undefined;
        game.addEventListener('pointerdown', () => { clickedAt = performance.now(); }, { capture: true, once: true });
        const observer = new MutationObserver(() => {
            if (clickedAt === undefined || counts() === before) return;
            game.dataset['mesureInteraction'] = String(performance.now() - clickedAt);
            observer.disconnect();
        });
        observer.observe(game, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-label'] });
    });
    await cached.mouse.click(point.x, point.y);
    const measured = cached.locator(`${game}[data-mesure-interaction]`);
    await measured.waitFor({ timeout: 3000 });
    const interaction_ms = Number(await measured.getAttribute('data-mesure-interaction'));

    const results = { fps, image_mediane_ms: medianFrameMs, ralentissement_cpu: 4, chargement_ms, interaction_ms };
    await mkdir('test-results', { recursive: true });
    await writeFile('test-results/performance.json', `${JSON.stringify(results, null, 2)}\n`);
    console.log('Performance', results);

    expect(medianFrameMs).toBeLessThanOrEqual(1000 / 60 + .1);
    expect(chargement_ms).toBeLessThan(3000);
    expect(interaction_ms).toBeLessThan(100);
});
