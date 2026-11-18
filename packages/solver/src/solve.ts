// Recherche en largeur bornée. Un budget dépassé rend « unverified », jamais « unsolvable ».
import { createInitialState, legalMoves, snapshotOf, step, type Snapshot } from '@cozy-room-sort/engine';
import type { Level } from '@cozy-room-sort/schemas';
import { stateKey } from './hash.ts';

export interface Budget { maxStates: number; maxMs?: number; now?: () => number }

export type SolveResult =
    | { kind: 'solved'; trace: readonly string[]; statesExplored: number }
    | { kind: 'unsolvable'; statesExplored: number }
    | { kind: 'unverified'; statesExplored: number };

export const DEFAULT_BUDGET: Budget = { maxStates: 200_000 };
export const HINT_BUDGET: Budget = { maxStates: 20_000 };

interface Node { snapshot: Snapshot; parent: string | null; move: string | null }

export function solve(level: Level, from: Snapshot = snapshotOf(createInitialState(level)), budget: Budget = DEFAULT_BUDGET): SolveResult {
    const start = budget.maxMs === undefined ? 0 : (budget.now?.() ?? 0);
    const rootKey = stateKey(from);
    const nodes = new Map<string, Node>([[rootKey, { snapshot: from, parent: null, move: null }]]);
    const queue: string[] = [rootKey];
    let explored = 0;
    for (let head = 0; head < queue.length; head++) {
        if (explored >= budget.maxStates) return { kind: 'unverified', statesExplored: explored };
        if (budget.maxMs !== undefined && (budget.now?.() ?? 0) - start > budget.maxMs) return { kind: 'unverified', statesExplored: explored };
        const key = queue[head] as string;
        const node = nodes.get(key) as Node;
        explored++;
        if (node.snapshot.status === 'won') return { kind: 'solved', trace: traceTo(nodes, key), statesExplored: explored };
        for (const move of legalMoves(level, node.snapshot)) {
            const result = step(level, node.snapshot, move);
            if ('rejected' in result) continue;
            const childKey = stateKey(result.snapshot);
            if (nodes.has(childKey)) continue;
            nodes.set(childKey, { snapshot: result.snapshot, parent: key, move });
            queue.push(childKey);
        }
    }
    return { kind: 'unsolvable', statesExplored: explored };
}

function traceTo(nodes: ReadonlyMap<string, Node>, key: string): string[] {
    const trace: string[] = [];
    for (let node = nodes.get(key); node?.move != null; node = node.parent === null ? undefined : nodes.get(node.parent)) trace.push(node.move);
    return trace.reverse();
}

/** R-009 : l'indice est le premier coup d'une solution depuis l'état courant ; null si aucune n'est trouvée. */
export function hint(level: Level, from: Snapshot): string | null {
    const result = solve(level, from, HINT_BUDGET);
    return result.kind === 'solved' ? (result.trace[0] ?? null) : null;
}
