import { expect, test } from '@playwright/test';
import { openLevel, levelScreen } from './helpers';

// La jauge vide ne montre aucun reste du remplissage imprimé sur la planche : à 0 %, aucun pixel vert (vert nettement
// au-dessus du rouge et du bleu, comme le remplissage de la planche) dans la jauge. La piste sombre, l'étoile et le
// cadre clair n'en ont aucun.
const greenPixels = async (png: Buffer, page: import('@playwright/test').Page): Promise<number> =>
    page.evaluate(async source => {
        const image = new Image();
        image.src = `data:image/png;base64,${source}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d')!;
        context.drawImage(image, 0, 0);
        const { data } = context.getImageData(0, 0, image.width, image.height);
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
            const [r, g, b, a] = [data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!];
            if (a > 128 && g > r + 8 && g > b + 20) count++;
        }
        return count;
    }, png.toString('base64'));

test('jauge vide : aucun reste du remplissage imprimé', async ({ page }) => {
    await openLevel(page, '001-salon');
    const progress = levelScreen(page).getByRole('progressbar', { name: 'Objets rangés' });
    await expect(progress).toHaveAttribute('aria-valuenow', '0');
    const shot = await progress.screenshot({ animations: 'disabled' });
    await test.info().attach('jauge-vide', { body: shot, contentType: 'image/png' });
    expect(await greenPixels(shot, page)).toBe(0);
});
