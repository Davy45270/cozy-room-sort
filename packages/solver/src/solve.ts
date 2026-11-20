import { createInitialState, isAccessible, legalMoves, snapshotOf, step, type Snapshot } from '@cozy-room-sort/engine';
import type { Level } from '@cozy-room-sort/schemas';
import { CostLayers, PriorityQueue } from './frontier.ts';
import { stateKey } from './hash.ts';

export interface Budget { maxStates: number; maxMs?: number; now?: () => number }
export interface SolveOptions {
    strategy?: 'bfs' | 'astar' | 'auto';
    maxStates?: number;
    maxMs?: number;
    clock?: () => number;
}

export type SolveResult =
    | { kind: 'solved'; trace: readonly string[]; buffered: number; statesExplored: number }
    | { kind: 'unsolvable'; statesExplored: number }
    | { kind: 'unverified'; statesExplored: number };

export const DEFAULT_BUDGET: Budget = { maxStates: 200_000 };
export const HINT_BUDGET: Budget = { maxStates: 20_000 };
export const ASTAR_THRESHOLD = 16;

interface Node { snapshot: Snapshot; parent: Node | null; move: string | null; cost: number }

export function solve(level: Level, options?: SolveOptions): SolveResult;
export function solve(level: Level, from: Snapshot | undefined, budget?: Budget): SolveResult;
export function solve(level: Level, input?: SolveOptions | Snapshot, budget?: Budget): SolveResult {
    const from = input && 'remainingObjectIds' in input ? input : snapshotOf(createInitialState(level));
    const options = input && !('remainingObjectIds' in input) ? input : undefined;
    const strategy = options?.strategy ?? 'auto';
    const astar = strategy === 'astar' || (strategy === 'auto' && from.remainingObjectIds.length >= ASTAR_THRESHOLD);
    const maxStates = options?.maxStates ?? budget?.maxStates ?? DEFAULT_BUDGET.maxStates;
    const maxMs = options?.maxMs ?? budget?.maxMs;
    const clock = options?.clock ?? budget?.now;
    if (maxMs !== undefined && !clock) throw new Error('Le budget de temps exige une horloge.');
    const start = clock?.() ?? 0;
    const timedOut = (): boolean => maxMs !== undefined && clock!() - start > maxMs;

    const rootKey = stateKey(from);
    const nodes = new Map<string, Node>([[rootKey, { snapshot: from, parent: null, move: null, cost: 0 }]]);
    const frontier = astar ? new PriorityQueue() : new CostLayers();
    const objectCategories = new Map(level.objects.map(object => [object.id, object.category]));
    const boxCategories = new Map(level.boxes.map(box => [box.id, box.category]));
    const forcedBuffer = (snapshot: Snapshot): number => {
        if (snapshot.remainingObjectIds.length === 0) return 0;
        const active = new Set(snapshot.activeBoxIds.map(id => boxCategories.get(id)));
        return snapshot.remainingObjectIds.some(id => active.has(objectCategories.get(id)) && isAccessible(level, snapshot, id)) ? 0 : 1;
    };
    const enqueue = (key: string, node: Node): void => {
        const remaining = node.snapshot.remainingObjectIds.length;
        // Coût A* = sélections + passages au tampon. Il faut au moins une sélection par objet restant.
        const selected = from.remainingObjectIds.length - remaining;
        // Quand aucun objet ne peut aller directement dans un carton, le prochain coup gagnant passe forcément au tampon.
        const estimate = astar ? node.cost + selected + remaining + forcedBuffer(node.snapshot) : node.cost;
        frontier.push({ key, cost: node.cost, remaining, estimate });
    };
    enqueue(rootKey, nodes.get(rootKey)!);

    let explored = 0;
    for (let entry = frontier.shift(); entry; entry = frontier.shift()) {
        const node = nodes.get(entry.key)!;
        if (node.cost !== entry.cost) continue;
        if (explored >= maxStates || timedOut()) return { kind: 'unverified', statesExplored: explored };
        explored++;
        if (node.snapshot.status === 'won') return { kind: 'solved', trace: traceTo(node), buffered: node.cost, statesExplored: explored };
        for (const move of legalMoves(level, node.snapshot)) {
            const result = step(level, node.snapshot, move);
            if ('rejected' in result) continue;
            const childKey = stateKey(result.snapshot);
            const cost = result.snapshot.bufferedCount - from.bufferedCount;
            const known = nodes.get(childKey);
            if (known && known.cost <= cost) continue;
            if (!known && nodes.size >= maxStates) return { kind: 'unverified', statesExplored: explored };
            const child = { snapshot: result.snapshot, parent: node, move, cost };
            nodes.set(childKey, child);
            enqueue(childKey, child);
        }
    }
    return { kind: timedOut() ? 'unverified' : 'unsolvable', statesExplored: explored };
}

function traceTo(last: Node): string[] {
    const trace: string[] = [];
    for (let node: Node | null = last; node?.move != null; node = node.parent) trace.push(node.move);
    return trace.reverse();
}

/** R-009 : l'indice est le premier coup d'une meilleure solution depuis l'état courant. */
export function hint(level: Level, from: Snapshot, budget: Budget = HINT_BUDGET): string | null {
    const result = solve(level, from, budget);
    return result.kind === 'solved' ? (result.trace[0] ?? null) : null;
}
