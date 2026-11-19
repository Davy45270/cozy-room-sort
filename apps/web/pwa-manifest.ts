// Repris de six-de-chaque (apps/web/pwa-manifest.ts).
import type { ManifestOptions } from 'vite-plugin-pwa';
import { TOKENS } from './src/theme/tokens.ts';
export const manifest: Partial<ManifestOptions> = {
    name: 'Cozy Room Sort',
    short_name: 'Cozy Room',
    description: 'Range une pièce en désordre, objet par objet, dans les bons cartons.',
    lang: 'fr',
    display: 'standalone',
    orientation: 'any',
    theme_color: TOKENS.light.bg,
    background_color: TOKENS.light.bg,
    start_url: './',
    scope: './',
    icons: [
        { src: 'icons/cozy-room-sort-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icons/cozy-room-sort-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icons/cozy-room-sort-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
};
