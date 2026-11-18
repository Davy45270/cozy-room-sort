// Recherche 0-1 bornée : ranger directement coûte 0, passer par le tampon coûte 1. La solution rendue minimise
// les passages par le tampon (ce que comptent les étoiles). Un budget dépassé rend « unverified », jamais « unsolvable ».
import { createInitialState, legalMoves, snapshotOf, step, type Snapshot } from '@cozy-room-sort/engine';
import type { Level } from '@cozy-room-sort/schemas';
import { stateKey } from './hash.ts';

export interface Budget { maxStates: number; maxMs?: number; now?: () => number }

export type SolveResult =
    | { kind: 'solved'; trace: readonly string[]; buffered: number; statesExplored: number }
    | { kind: 'unsolvable'; statesExplored: number }
    | { kind: 'unverified'; statesExplored: number };

export const DEFAULT_BUDGET: Budget = { maxStates: 200_000 };
export const HINT_BUDGET: Budget = { maxStates: 20_000 };

interface Node { snapshot: Snapshot; parent: string | null; move: string | null; cost: number }

export function solve(level: Level, from: Snapshot = snapshotOf(createInitialState(level)), budget: Budget = DEFAULT_BUDGET): SolveResult {
    const start = budget.maxMs === undefined ? 0 : (budget.now?.() ?? 0);
    const rootKey = stateKey(from);
    const nodes = new Map<string, Node>([[rootKey, { snapshot: from, parent: null, move: null, cost: 0 }]]);
    const settled = new Set<string>();
    let explored = 0;
    // Une couche par coût : les coups gratuits restent dans la couche courante, les passages au tampon vont à la suivante.
    for (let layer = [rootKey], cost = 0; layer.length > 0; cost++) {
        const next: string[] = [];
        for (let head = 0; head < layer.length; head++) {
            const key = layer[head] as string;
            const node = nodes.get(key) as Node;
            if (settled.has(key) || node.cost !== cost) continue;
            if (explored >= budget.maxStates) return { kind: 'unverified', statesExplored: explored };
            if (budget.maxMs !== undefined && (budget.now?.() ?? 0) - start > budget.maxMs) return { kind: 'unverified', statesExplored: explored };
            settled.add(key);
            explored++;
            if (node.snapshot.status === 'won') return { kind: 'solved', trace: traceTo(nodes, key), buffered: cost, statesExplored: explored };
            for (const move of legalMoves(level, node.snapshot)) {
                const result = step(level, node.snapshot, move);
                if ('rejected' in result) continue;
                const childKey = stateKey(result.snapshot);
                if (settled.has(childKey)) continue;
                const childCost = cost + (result.snapshot.bufferedCount > node.snapshot.bufferedCount ? 1 : 0);
                const known = nodes.get(childKey);
                if (known && known.cost <= childCost) continue;
                nodes.set(childKey, { snapshot: result.snapshot, parent: key, move, cost: childCost });
                (childCost === cost ? layer : next).push(childKey);
            }
        }
        layer = next;
    }
    return { kind: 'unsolvable', statesExplored: explored };
}

function traceTo(nodes: ReadonlyMap<string, Node>, key: string): string[] {
    const trace: string[] = [];
    for (let node = nodes.get(key); node?.move != null; node = node.parent === null ? undefined : nodes.get(node.parent)) trace.push(node.move);
    return trace.reverse();
}

/** R-009 : l'indice est le premier coup d'une meilleure solution depuis l'état courant ; null si aucune n'est trouvée. */
export function hint(level: Level, from: Snapshot, budget: Budget = HINT_BUDGET): string | null {
    const result = solve(level, from, budget);
    return result.kind === 'solved' ? (result.trace[0] ?? null) : null;
}
