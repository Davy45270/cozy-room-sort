import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Level } from '@cozy-room-sort/schemas';
import { replayTrace } from '@cozy-room-sort/solver';
import { describe, expect, it } from 'vitest';

const fixtures = 'packages/schemas/test/fixtures';
const run = (tool: string, ...args: string[]): { code: number; out: string } => {
    try {
        return { code: 0, out: execFileSync('node', [`tools/${tool}.ts`, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
    } catch (error) {
        const { status, stdout } = error as { status: number; stdout: string };
        return { code: status, out: stdout };
    }
};

describe('commandes en ligne', () => {
    it('level:validate accepte un niveau valide et soluble', () => {
        const r = run('validate-levels', `${fixtures}/valid-mini.json`);
        expect(r.code).toBe(0);
        expect(r.out).toMatch(/^OK valid-mini 3 objets, 0 passage/);
    });

    it('level:validate refuse un cycle et un niveau insoluble', () => {
        const cycle = run('validate-levels', `${fixtures}/cycle.json`);
        expect(cycle.code).toBe(1);
        expect(cycle.out).toContain('ÉCHEC');
        const impossible = run('validate-levels', 'tests/fixtures/levels/impossible.json');
        expect(impossible.code).toBe(1);
        expect(impossible.out).toContain('insoluble');
    });

    it('level:validate refuse des étoiles plus exigeantes que l\'optimum', () => {
        const r = run('validate-levels', 'tests/fixtures/levels/too-strict.json');
        expect(r.code).toBe(1);
        expect(r.out).toContain('trois étoiles à 0 passage(s)');
    });

    it('level:solve --write enregistre une solution rejouable', () => {
        const dir = mkdtempSync(join(tmpdir(), 'cozy-solve-'));
        try {
            const copy = join(dir, 'mini.json');
            copyFileSync(`${fixtures}/valid-mini.json`, copy);
            expect(run('solve-level', copy, '--write').code).toBe(0);
            const level = JSON.parse(readFileSync(copy, 'utf8')) as Level;
            expect(level.meta?.solution).toHaveLength(3);
            expect(level.meta?.engineVersion).toBe('0.1.0');
            expect(replayTrace(level, level.meta?.solution ?? [])).toBe('won');
        } finally { rmSync(dir, { recursive: true, force: true }); }
    });
});
