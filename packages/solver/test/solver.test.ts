import { readFileSync } from 'node:fs';
import { applyAction, createInitialState, legalMoves, snapshotOf } from '@cozy-room-sort/engine';
import { validateLevel, type Level } from '@cozy-room-sort/schemas';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbLevel } from '../../engine/test/arbitraries.ts';
import { makeLevel } from '../../engine/test/levels.ts';
import { hint, replayTrace, solve, stateKey } from '../src/index.ts';

const impossible = JSON.parse(readFileSync(new URL('../../../tests/fixtures/levels/impossible.json', import.meta.url), 'utf8')) as Level;
const easy = makeLevel({
    boxes: [['books', 2], ['plants', 2], ['toys', 2]],
    objects: [['p1', 'plants'], ['b1', 'books', ['p1']], ['t1', 'toys'], ['b2', 'books', ['t1']], ['p2', 'plants', ['b2'], true], ['t2', 'toys']],
    rules: { bufferCapacity: 2 }
});

describe('solveur', () => {
    it('résout un niveau facile avec une trace minimale et rejouable', () => {
        expect(validateLevel(easy).ok).toBe(true);
        const result = solve(easy);
        expect(result.kind).toBe('solved');
        if (result.kind !== 'solved') return;
        expect(result.trace).toHaveLength(easy.objects.length);
        expect(replayTrace(easy, result.trace)).toBe('won');
    });

    it('T-009 : un niveau impossible est rejeté comme insoluble', () => {
        expect(validateLevel(impossible).ok).toBe(true);
        expect(solve(impossible)).toEqual({ kind: 'unsolvable', statesExplored: 2 });
    });

    it('un budget d\'états dépassé rend « non vérifié », jamais « insoluble »', () => {
        expect(solve(impossible, undefined, { maxStates: 1 })).toEqual({ kind: 'unverified', statesExplored: 1 });
    });

    it('un budget de temps dépassé rend « non vérifié »', () => {
        const clock = [0, 10_000];
        const now = (): number => clock.shift() ?? 10_000;
        expect(solve(easy, undefined, { maxStates: 1000, maxMs: 50, now }).kind).toBe('unverified');
    });

    it('l\'empreinte ignore l\'ordre de la pièce mais pas celui du tampon', () => {
        const s = snapshotOf(createInitialState(easy));
        expect(stateKey({ ...s, remainingObjectIds: [...s.remainingObjectIds].reverse() })).toBe(stateKey(s));
        expect(stateKey({ ...s, bufferObjectIds: ['p1', 't1'] })).not.toBe(stateKey({ ...s, bufferObjectIds: ['t1', 'p1'] }));
    });

    it('R-009 : l\'indice est un coup légal ; aucun indice depuis un état bloqué', () => {
        const start = createInitialState(easy);
        const move = hint(easy, start);
        expect(move).not.toBeNull();
        expect(legalMoves(easy, start)).toContain(move);
        const blocked = applyAction(impossible, createInitialState(impossible), { type: 'SELECT_OBJECT', objectId: 'b1' }).state;
        expect(blocked.status).toBe('blocked');
        expect(hint(impossible, blocked)).toBeNull();
    });

    it('invariant : toute trace du solveur se rejoue jusqu\'à la victoire', () => {
        let solved = 0;
        fc.assert(fc.property(arbLevel({ maxObjects: 12 }), level => {
            const result = solve(level, undefined, { maxStates: 50_000 });
            if (result.kind === 'solved') {
                solved++;
                expect(replayTrace(level, result.trace)).toBe('won');
            }
        }), { numRuns: 100, seed: 20261118 });
        // La propriété ne vaut que si le générateur produit assez de niveaux solubles.
        expect(solved).toBeGreaterThanOrEqual(30);
    });
});
