import { expect, test } from '@playwright/test';
import { openLevel } from './helpers';

// Les sons sont facultatifs : un joueur peut les activer pour la première fois hors ligne.
// Aucun son n'est joué ici, seule la disponibilité des fichiers est vérifiée.
const SONS = ['selection', 'rangement', 'carton-ferme', 'victoire'];

test('hors ligne, les sons jamais chargés en ligne sont servis par le cache', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'service worker hors ligne vérifié sur Chromium');
    await openLevel(page, '002-salon');
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    await context.setOffline(true);
    const statuts = await page.evaluate(async (noms) => {
        const resultats: Record<string, number | string> = {};
        for (const nom of noms) for (const ext of ['ogg', 'mp3']) {
            const url = new URL(`sons/${nom}.${ext}`, document.baseURI);
            try {
                const reponse = await fetch(url);
                resultats[`${nom}.${ext}`] = reponse.ok ? (await reponse.blob()).size > 0 ? 200 : 'vide' : reponse.status;
            } catch {
                resultats[`${nom}.${ext}`] = 'échec';
            }
        }
        return resultats;
    }, SONS);
    expect(statuts).toEqual(Object.fromEntries(SONS.flatMap(nom => [[`${nom}.ogg`, 200], [`${nom}.mp3`, 200]])));
});
