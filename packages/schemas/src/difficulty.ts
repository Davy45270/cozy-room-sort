import type { Difficulty } from './level.ts';

interface Thresholds {
    objects: readonly [number, number];
    categories: readonly [number, number];
    bufferCapacity: number;
    hiddenPercent: readonly [number, number];
}

export const DIFFICULTIES: Readonly<Record<Difficulty, Thresholds>> = {
    easy: { objects: [9, 15], categories: [3, 3], bufferCapacity: 5, hiddenPercent: [0, 10] },
    medium: { objects: [16, 30], categories: [4, 6], bufferCapacity: 4, hiddenPercent: [10, 25] },
    expert: { objects: [31, 60], categories: [6, 10], bufferCapacity: 3, hiddenPercent: [25, 45] }
};

export function isDifficulty(value: unknown): value is Difficulty {
    return value === 'easy' || value === 'medium' || value === 'expert';
}
