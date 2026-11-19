// Repris de six-de-chaque (apps/web/vite.config.ts), sans React : DOM et Phaser.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { manifest } from './pwa-manifest.ts';
import type { Rectangle } from './src/atlas.ts';

interface AtlasEntry { id: string; atlas: string; hitbox: Rectangle }

const provenancePath = fileURLToPath(new URL('../../content/assets/provenance.json', import.meta.url));

export default defineConfig({
    base: './',
    build: { outDir: '../../dist', emptyOutDir: true, chunkSizeWarningLimit: 1600 },
    plugins: [{
        name: 'crs-atlas-hitboxes',
        enforce: 'pre',
        transform(source, id) {
            if (id !== provenancePath) return;
            // L'application utilise les boîtes utiles. Les données d'attribution restent dans le dépôt.
            const entries = JSON.parse(source) as AtlasEntry[];
            return JSON.stringify(entries.filter(({ atlas }) => !atlas.endsWith('-meubles') && atlas !== 'p04-ui')
                .map(({ id, atlas, hitbox }) => ({ id, atlas, hitbox })));
        }
    }, VitePWA({
        strategies: 'generateSW',
        registerType: 'autoUpdate',
        manifest,
        includeManifestIcons: false,
        workbox: {
            cacheId: 'cozy-room-sort',
            clientsClaim: true,
            skipWaiting: true,
            cleanupOutdatedCaches: true,
            maximumFileSizeToCacheInBytes: 3_000_000,
            globPatterns: ['**/*.{html,js,css,png,webp,json}']
        }
    })]
});
