import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Level } from '@cozy-room-sort/schemas';
import { replayTrace } from '@cozy-room-sort/solver';
import { describe, expect, it } from 'vitest';
import { activeThemes } from '../../content/themes/index.ts';

const fixtures = 'tests/fixtures/levels';
const run = (tool: string, ...args: string[]): { code: number; out: string; err: string } => {
    const result = spawnSync(process.execPath, [`tools/${tool}.ts`, ...args], { encoding: 'utf8' });
    if (result.error) throw result.error;
    return { code: result.status ?? 1, out: result.stdout, err: result.stderr };
};

describe('commandes en ligne', () => {
    it('level:validate accepte un niveau valide et soluble', () => {
        const r = run('validate-levels', `${fixtures}/valid-mini.json`);
        expect(r.code).toBe(0);
        expect(r.out).toMatch(/^OK valid-mini 9 objets, 0 passage/);
    });

    it('level:validate refuse un cycle et un niveau insoluble', () => {
        const cycle = run('validate-levels', `${fixtures}/cycle.json`);
        expect(cycle.code).toBe(1);
        expect(cycle.out).toContain('ÉCHEC');
        const impossible = run('validate-levels', 'tests/fixtures/levels/impossible-publication.json');
        expect(impossible.code).toBe(1);
        expect(impossible.out).toContain('insoluble');
    });

    it('level:validate refuse des étoiles plus exigeantes que l\'optimum', () => {
        const r = run('validate-levels', 'tests/fixtures/levels/too-strict.json');
        expect(r.code).toBe(1);
        expect(r.out).toContain('trois étoiles à 0 passage(s)');
    });

    it('level:validate refuse une pièce que le catalogue du jeu écarterait', () => {
        const dir = mkdtempSync(join(tmpdir(), 'cozy-theme-'));
        try {
            const level = JSON.parse(readFileSync(`${fixtures}/valid-mini.json`, 'utf8')) as Level;
            const path = join(dir, 'piece-inconnue.json');
            writeFileSync(path, JSON.stringify({ ...level, theme: 'piece-inconnue' }));
            const r = run('validate-levels', path);
            expect(r.code).toBe(1);
            expect(r.out).toContain('ÉCHEC piece-inconnue : pièce absente du catalogue (piece-inconnue)');
            const inactive = ['cuisine', 'salle-de-bain'].find(id => !activeThemes.some(theme => theme.id === id));
            if (inactive) {
                writeFileSync(path, JSON.stringify({ ...level, theme: inactive }));
                expect(run('validate-levels', path).out).toContain(`pièce absente du catalogue (${inactive})`);
            }
        } finally { rmSync(dir, { recursive: true, force: true }); }
    });

    it('level:solve --write enregistre une solution rejouable', () => {
        const dir = mkdtempSync(join(tmpdir(), 'cozy-solve-'));
        try {
            const copy = join(dir, 'mini.json');
            copyFileSync(`${fixtures}/valid-mini.json`, copy);
            expect(run('solve-level', copy, '--write').code).toBe(0);
            const level = JSON.parse(readFileSync(copy, 'utf8')) as Level;
            expect(level.meta?.solution).toHaveLength(9);
            expect(level.meta?.engineVersion).toBe('0.1.0');
            expect(replayTrace(level, level.meta?.solution ?? [])).toBe('won');
        } finally { rmSync(dir, { recursive: true, force: true }); }
    });
});

it('level:generate : génère uniquement des niveaux validés, avec les alias des pièces', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cozy-generate-'));
    try {
        const args = ['--difficulty', 'easy', '--count', '2', '--seed', '42', '--out', dir];
        expect(run('generate-levels', '--theme', 'living-room', ...args).code).toBe(0);
        expect(run('validate-levels', dir).code).toBe(0);
        const inactiveAlias = activeThemes.some(theme => theme.id === 'cuisine') ? 'bathroom' : 'kitchen';
        const missing = run('generate-levels', '--theme', inactiveAlias, ...args);
        expect(missing.code).toBe(1);
        expect(missing.out).toContain('univers absent');
    } finally { rmSync(dir, { recursive: true, force: true }); }
});

it('refuse un lot qui écraserait un fichier avant de publier les nouveaux niveaux', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cozy-generate-'));
    try {
        const existing = join(dir, '002-salon.json');
        copyFileSync(`${fixtures}/valid-mini.json`, existing);
        const before = readFileSync(existing, 'utf8');
        const args = ['--theme', 'salon', '--difficulty', 'easy', '--count', '2', '--out', dir];
        expect(run('generate-levels', ...args).code).toBe(1);
        expect(readFileSync(existing, 'utf8')).toBe(before);
        expect(existsSync(join(dir, '001-salon.json'))).toBe(false);
    } finally { rmSync(dir, { recursive: true, force: true }); }
});

it('level:benchmark : mesure les décisions et les issues bloquantes sur un petit niveau', () => {
    const { code, out, err } = run('benchmark-solver', 'tests/fixtures/levels/benchmark.json');
    expect(code).toBe(0);
    expect(JSON.parse(out)).toEqual([expect.objectContaining({
        status: 'solved', statesExplored: 25, optimalLength: 9, nonTrivialDecisions: 5,
        legalMoves: 24, blockingMoves: 15, blockingMoveShare: 15 / 24
    })]);
    expect(err).toContain('Décisions');
    expect(err).toContain('62.5 %');
});

it('level:generate --catalog --theme : régénère les six niveaux du troisième univers', () => {
    const theme = activeThemes.find(item => item.id !== 'salon' && item.id !== 'chambre')!;
    const dir = mkdtempSync(join(tmpdir(), 'cozy-catalogue-'));
    try {
        const generated = run('generate-levels', '--catalog', '--theme', theme.id, '--out', dir);
        expect(generated.code, generated.out + generated.err).toBe(0);
        expect(readdirSync(dir).sort()).toEqual(Array.from({ length: 6 }, (_, i) => `0${15 + i}-${theme.id}.json`));
        expect(run('validate-levels', dir).code).toBe(0);
    } finally { rmSync(dir, { recursive: true, force: true }); }
});

it('level:validate refuse un bloqueur dont la couche ne le place pas devant', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cozy-superposition-'));
    try {
        const level = JSON.parse(readFileSync('content/levels/001-salon.json', 'utf8')) as Level;
        const blocked = level.objects.find(object => object.blockedBy.length > 0)!;
        const blocker = level.objects.find(object => object.id === blocked.blockedBy[0])!;
        blocker.layer = blocked.layer;
        const path = join(dir, 'couche.json');
        writeFileSync(path, JSON.stringify(level));
        const verdict = run('validate-levels', path);
        expect(verdict.code).toBe(1);
        expect(verdict.out).toContain(`${blocker.id} doit être devant ${blocked.id}`);
    } finally { rmSync(dir, { recursive: true, force: true }); }
});


it('level:validate refuse le salon historique en 1.1 : format migré, contrôle géométrique appliqué, même après level:solve --write', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cozy-salon-historique-'));
    try {
        const path = join(dir, 'salon.json');
        copyFileSync(`${fixtures}/salon-format-1.1.json`, path);
        const check = (): void => {
            const verdict = run('validate-levels', path);
            expect(verdict.code, verdict.out + verdict.err).toBe(1);
            expect(verdict.out).toMatch(/ÉCHEC salon : format 1\.1 migré ; contrôle géométrique appliqué : .*recouvrement de objet-43004-1 et objet-43004-7/);
        };
        check();
        expect(run('solve-level', path, '--write').code).toBe(0);
        check();
    } finally { rmSync(dir, { recursive: true, force: true }); }
});

it('level:validate refuse le même salon déclaré en 1.2 aux recouvrements incorrects', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cozy-recouvrement-'));
    try {
        const data = JSON.parse(readFileSync(`${fixtures}/salon-format-1.1.json`, 'utf8')) as Level;
        const path = join(dir, 'recouvrement.json');
        writeFileSync(path, JSON.stringify({ ...data, schemaVersion: '1.2' }));
        const verdict = run('validate-levels', path);
        expect(verdict.code).toBe(1);
        expect(verdict.out).toContain('recouvrement de objet-43004-1 et objet-43004-7');
    } finally { rmSync(dir, { recursive: true, force: true }); }
});
