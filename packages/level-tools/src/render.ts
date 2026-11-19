import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import type { Level } from '@cozy-room-sort/schemas';
import { PREVIEW_HEIGHT, PREVIEW_WIDTH, previewHtml } from './preview.ts';

export async function renderLevel(level: Level, output: string): Promise<void> {
    const html = previewHtml(level);
    const directory = await mkdtemp(join(tmpdir(), 'cozy-render-'));
    try {
        const file = join(directory, 'level.html');
        await writeFile(file, html);
        const browser = await chromium.launch();
        try {
            const page = await browser.newPage({ viewport: { width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }, deviceScaleFactor: 1 });
            await page.goto(pathToFileURL(file).href);
            await page.evaluate(async () => {
                await Promise.all(Array.from(document.images, image => image.decode()));
            });
            await page.screenshot({ path: output, type: 'png' });
        } finally {
            await browser.close();
        }
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
}
