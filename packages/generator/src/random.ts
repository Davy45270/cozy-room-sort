// Mulberry32, alimenté par les deux mots d'une graine entière sûre.
export function seededRandom(seed: number): () => number {
    let state = (seed ^ Math.imul(Math.floor(seed / 0x100000000), 0x9e3779b9)) >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let mixed = Math.imul(state ^ (state >>> 15), state | 1);
        mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
        return ((mixed ^ (mixed >>> 14)) >>> 0) / 0x100000000;
    };
}

export function shuffled<T>(items: readonly T[], random: () => number): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j]!, result[i]!];
    }
    return result;
}
