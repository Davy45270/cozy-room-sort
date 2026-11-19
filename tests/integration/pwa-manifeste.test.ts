// L'application est une PWA installable, construite par Vite avec vite-plugin-pwa.
// Le test lit la configuration et le manifeste déclaré, sans lancer de build.
import { existsSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { manifest } from '../../apps/web/pwa-manifest.ts';

const read = (file: string): string => readFileSync(file, 'utf8');

/** Largeur et hauteur lues dans le bloc IHDR d'un PNG. */
function pngSize(file: string): { w: number; h: number } {
    const bytes = readFileSync(file);
    expect(bytes.subarray(0, 8).toString('hex'), file).toBe('89504e470d0a1a0a');
    expect(bytes.toString('ascii', 12, 16), file).toBe('IHDR');
    return { w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) };
}

it('Vite construit l’application et vite-plugin-pwa y est importé puis branché avec le manifeste', () => {
    const config = read('apps/web/vite.config.ts');
    expect(config).toMatch(/^import \{ defineConfig \} from 'vite';$/m);
    expect(config).toMatch(/^export default defineConfig\(/m);
    expect(config).toMatch(/^import \{ VitePWA \} from 'vite-plugin-pwa';$/m);
    expect(config).toMatch(/^import \{ manifest \} from '\.\/pwa-manifest\.ts';$/m);
    // Le greffon figure dans la liste des plugins, reçoit le manifeste et engendre le service worker.
    const call = /VitePWA\(\{([\s\S]*)\}\)\]/.exec(config)?.[1] ?? '';
    expect(call).toMatch(/^\s*manifest,$/m);
    expect(call).toMatch(/strategies: 'generateSW'/);
    const { devDependencies } = JSON.parse(read('package.json')) as { devDependencies: Record<string, string> };
    expect(devDependencies).toHaveProperty('vite');
    expect(devDependencies).toHaveProperty('vite-plugin-pwa');
});

it('le manifeste déclaré rend la PWA installable : nom, adresse de départ, affichage autonome, icônes 192 et 512 présentes', () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBe('standalone');
    const icons = manifest.icons ?? [];
    const purposes = (purpose: string | string[] | undefined): string[] =>
        Array.isArray(purpose) ? purpose : (purpose ?? 'any').split(' ');
    for (const size of [192, 512]) {
        const icon = icons.find(item => item.sizes === `${size}x${size}` && purposes(item.purpose).includes('any'));
        expect(icon, `icône ${size}`).toBeDefined();
        if (!icon) continue;
        expect(icon.type).toBe('image/png');
        // Le dossier public de Vite est copié tel quel à la racine du build.
        const file = `apps/web/public/${icon.src}`;
        expect(existsSync(file), file).toBe(true);
        expect(pngSize(file)).toEqual({ w: size, h: size });
    }
});
