// Repris de six-de-chaque (playwright.config.ts) ; trois moteurs en profil mobile, plus Chromium au bureau. Port 4203.
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
    testDir: 'tests/e2e',
    workers: 1,
    fullyParallel: false,
    timeout: 60_000,
    forbidOnly: Boolean(process.env['CI']),
    use: { locale: 'fr-FR', baseURL: 'http://127.0.0.1:4203' },
    projects: [
        { name: 'chromium-mobile', use: { ...devices['Pixel 7'] } },
        { name: 'firefox-mobile', use: { browserName: 'firefox', viewport: { width: 412, height: 915 }, hasTouch: true } },
        { name: 'webkit-mobile', use: { ...devices['iPhone 13'] } },
        { name: 'chromium-desktop', use: { browserName: 'chromium', viewport: { width: 1280, height: 900 } } }
    ],
    webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 4203 --strictPort', url: 'http://127.0.0.1:4203', reuseExistingServer: false }
});
