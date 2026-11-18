// Repris de six-de-chaque (vitest.config.ts) ; les tests vivent à la racine et dans chaque paquet.
import { defineConfig } from 'vitest/config';
export default defineConfig({
    test: {
        include: ['tests/*.test.ts', 'packages/*/test/**/*.test.ts'],
        pool: 'threads',
        maxWorkers: 2,
        testTimeout: 30_000
    }
});
