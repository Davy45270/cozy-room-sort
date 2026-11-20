import { readFileSync } from 'node:fs';
import { applyAction, createInitialState, legalMoves, snapshotOf } from '@cozy-room-sort/engine';
import { type Level } from '@cozy-room-sort/schemas';
import { describe, expect, it } from 'vitest';
import { makeLevel } from '../engine/levels.ts';
import { hint, replayTrace, solve, stateKey } from '../../../packages/solver/src/index.ts';

const impossible = JSON.parse(readFileSync(new URL('../../fixtures/levels/impossible.json', import.meta.url), 'utf8')) as Level;
const easy = makeLevel({
    boxes: [['books', 2], ['plants', 2], ['toys', 2]],
    objects: [['p1', 'plants'], ['b1', 'books', ['p1']], ['t1', 'toys'], ['b2', 'books', ['t1']], ['p2', 'plants', ['b2'], true], ['t2', 'toys']],
    rules: { bufferCapacity: 2 }
});

describe('solveur', () => {
    it('résout un niveau facile avec une trace minimale et rejouable', () => {
        const result = solve(easy);
        expect(result.kind).toBe('solved');
        if (result.kind !== 'solved') return;
        expect(result.trace).toHaveLength(easy.objects.length);
        // p1 et t1 recouvrent les deux livres : ils passent forcément par le tampon avant que le carton livres se ferme.
        expect(result.buffered).toBe(2);
        expect(replayTrace(easy, result.trace)).toBe('won');
    });

    it('minimise les passages par le tampon, là où un parcours naïf en compterait un', () => {
        // L'ordre du niveau propose b1 d'abord : le premier chemin trouvé passerait par le tampon.
        const detour = makeLevel({ boxes: [['a', 1], ['b', 1]], objects: [['b1', 'b'], ['a1', 'a']] });
        const result = solve(detour);
        expect(result).toMatchObject({ kind: 'solved', trace: ['a1', 'b1'], buffered: 0 });
    });

    it('T-009 : un niveau impossible est rejeté comme insoluble', () => {
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

    it('une échéance passée pendant la dernière expansion rend « non vérifié », pas « insoluble »', () => {
        // Sans échéance, l'espace d'un niveau impossible s'épuise après `explored` expansions. On rejoue la même recherche
        // avec une horloge à 0 pour le départ et une lecture par expansion, puis au-delà de l'échéance de 50 ms.
        const free = solve(impossible, undefined, { maxStates: 1000, maxMs: 50, now: () => 0 });
        expect(free.kind).toBe('unsolvable');
        let reads = 0;
        const now = (): number => (++reads <= 1 + free.statesExplored ? 0 : 51);
        expect(solve(impossible, undefined, { maxStates: 1000, maxMs: 50, now }).kind).toBe('unverified');
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

});

it('A* suit les états plus avancés à coût égal et respecte son budget', () => {
    const level = makeLevel({
        boxes: [['a', 4]],
        objects: [['a1', 'a'], ['a2', 'a'], ['a3', 'a'], ['a4', 'a']]
    });
    const bfs = solve(level, { strategy: 'bfs' });
    expect(bfs).toMatchObject({ kind: 'solved', statesExplored: 16 });
    const astar = solve(level, { strategy: 'astar' });
    expect(astar).toMatchObject({ kind: 'solved', statesExplored: 5 });
    expect(solve(level, { strategy: 'astar', maxStates: 1 }).kind).toBe('unverified');
    let tick = 0;
    expect(solve(level, { strategy: 'astar', maxMs: 1, clock: () => tick += 2 }).kind).toBe('unverified');
});
