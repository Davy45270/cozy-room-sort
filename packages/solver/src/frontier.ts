// La pile de priorité départage les estimations égales en faveur des états les plus avancés.
export interface Entry {
    key: string;
    cost: number;
    remaining: number;
    estimate: number;
}

const before = (a: Entry, b: Entry): boolean =>
    a.estimate < b.estimate || (a.estimate === b.estimate && a.remaining < b.remaining);

export class PriorityQueue {
    private readonly entries: Entry[] = [];

    push(entry: Entry): void {
        let index = this.entries.length;
        this.entries.push(entry);
        while (index > 0) {
            const parent = Math.floor((index - 1) / 2);
            const previous = this.entries[parent]!;
            if (!before(entry, previous)) break;
            this.entries[index] = previous;
            index = parent;
        }
        this.entries[index] = entry;
    }

    shift(): Entry | undefined {
        const first = this.entries[0];
        const last = this.entries.pop();
        if (!last || this.entries.length === 0) return first;
        let index = 0;
        while (index * 2 + 1 < this.entries.length) {
            const left = index * 2 + 1;
            const right = this.entries[left + 1];
            const child = right && before(right, this.entries[left]!) ? left + 1 : left;
            const entry = this.entries[child]!;
            if (!before(entry, last)) break;
            this.entries[index] = entry;
            index = child;
        }
        this.entries[index] = last;
        return first;
    }
}

// Parcours en largeur par couches de coût 0–1. Les arcs gratuits restent dans la couche courante.
export class CostLayers {
    private layers: Entry[][] = [[]];
    private head = 0;
    private cost = 0;

    push(entry: Entry): void {
        (this.layers[entry.cost - this.cost] ??= []).push(entry);
    }

    shift(): Entry | undefined {
        if (this.head >= this.layers[0]!.length && this.layers.length > 1) {
            this.layers = this.layers.slice(1);
            this.cost++;
            this.head = 0;
        }
        const entry = this.layers[0]![this.head];
        if (entry) this.head++;
        return entry;
    }
}
