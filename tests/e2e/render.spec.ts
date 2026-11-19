import { execFile } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { promisify } from 'node:util';
import { expect, test } from '@playwright/test';

test('la commande produit une capture PNG de la pièce et de ses objets', async ({ page }, info) => {
    test.skip(info.project.name !== 'chromium-desktop', 'La commande lance déjà son propre navigateur');
    const output = info.outputPath('niveau.png');
    await mkdir(dirname(output), { recursive: true });
    await promisify(execFile)(process.execPath, ['tools/render-level.ts', 'content/levels/004-salon.json', '--out', output]);
    const png = await readFile(output);
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([960, 880]);
    const colors = await page.evaluate(async base64 => {
        const image = new Image();
        image.src = `data:image/png;base64,${base64}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(140, 90, 680, 560).data;
        const colors = new Set<number>();
        for (let i = 0; i < pixels.length; i += 64) {
            colors.add((pixels[i]! << 16) | (pixels[i + 1]! << 8) | pixels[i + 2]!);
        }
        return colors.size;
    }, png.toString('base64'));
    expect(colors).toBeGreaterThan(100);
    await info.attach('niveau', { path: output, contentType: 'image/png' });
});
