// Les tests unitaires, de propriétés et d’intégration sont rangés par type.
import { defineConfig } from 'vitest/config';
export default defineConfig({
    test: {
        include: ['tests/{unit,property,integration}/**/*.test.ts'],
        pool: 'threads',
        maxWorkers: 2,
        testTimeout: 30_000
    }
});
