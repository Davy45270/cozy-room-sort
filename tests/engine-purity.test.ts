// Repris de six-de-chaque (tests/engine-purity.test.ts), étendu aux schémas, au solveur et à l'art.
import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { it, expect } from 'vitest';

const lint = (probe: string): string => {
    try {
        execFileSync('npx', ['oxlint', '--max-warnings=0', probe], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        return '';
    } catch (error) {
        const { stdout, stderr } = error as { stdout: string; stderr: string };
        return stdout + stderr || 'failed';
    }
};
// Les paquets purs n'atteignent ni l'horloge, ni le DOM, ni le hasard, ni le moteur de rendu : oxlint l'impose.
it.each(['packages/schemas/src', 'packages/engine/src', 'packages/solver/src', 'packages/art/src'])('engine purity is enforced by lint in %s', folder => {
    const probe = `${folder}/__lint_probe.ts`;
    writeFileSync(probe, "import 'phaser';\nexport const a = Math.random();\nexport const b = new Date();\nexport const c = document.title;\n");
    try {
        const output = lint(probe);
        expect(output).toContain('no-restricted-imports');
        expect(output).toContain('no-restricted-properties');
        expect(output).toContain('no-restricted-globals');
    } finally { rmSync(probe, { force: true }); }
}, 60_000);
