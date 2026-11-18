// Repris de six-de-chaque (apps/web/vite.config.ts), sans React : DOM et Phaser.
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { manifest } from './pwa-manifest.ts';

export default defineConfig({
    base: './',
    build: { outDir: '../../dist', emptyOutDir: true, chunkSizeWarningLimit: 1600 },
    plugins: [VitePWA({
        strategies: 'generateSW',
        registerType: 'autoUpdate',
        manifest,
        workbox: {
            cacheId: 'cozy-room-sort',
            clientsClaim: true,
            skipWaiting: true,
            cleanupOutdatedCaches: true,
            maximumFileSizeToCacheInBytes: 3_000_000,
            globPatterns: ['**/*.{html,js,css,png,svg,webmanifest}']
        }
    })]
});
