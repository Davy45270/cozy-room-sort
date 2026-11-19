import { createInitialState, legalMoves, snapshotOf, step, type Snapshot } from '@cozy-room-sort/engine';
import type { Level } from '@cozy-room-sort/schemas';
import { stateKey } from './hash.ts';

export interface DecisionMetrics {
    nonTrivialDecisions: number;
    legalMoves: number;
    blockingMoves: number;
    blockingMoveShare: number;
}

/** Compte chaque choix depuis chaque état normalisé atteignable, y compris hors de la solution optimale. */
export function measureDecisions(level: Level, maxStates = 200_000): DecisionMetrics | null {
    const memo = new Map<string, number>();
    let legal = 0;
    let blocking = 0;
    let decisions = 0;
    let visited = 0;

    function visit(state: Snapshot): number | undefined {
        const key = stateKey(state);
        const known = memo.get(key);
        if (known !== undefined) return known;
        if (visited >= maxStates) return undefined;
        visited++;
        let best = state.status === 'won' ? 0 : Infinity;
        const costs = new Set<number>();
        for (const move of legalMoves(level, state)) {
            const transition = step(level, state, move);
            if ('rejected' in transition) continue;
            const next = transition.snapshot;
            const tail = visit(next);
            if (tail === undefined) return undefined;
            const cost = tail + next.bufferedCount - state.bufferedCount;
            legal++;
            if (cost === Infinity) blocking++;
            costs.add(cost);
            best = Math.min(best, cost);
        }
        if (costs.size > 1) decisions++;
        memo.set(key, best);
        return best;
    }

    if (visit(snapshotOf(createInitialState(level))) === undefined) return null;
    return { nonTrivialDecisions: decisions, legalMoves: legal, blockingMoves: blocking, blockingMoveShare: legal === 0 ? 0 : blocking / legal };
}
