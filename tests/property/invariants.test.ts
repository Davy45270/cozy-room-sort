import { type Level } from '@cozy-room-sort/schemas';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyAction, createInitialState, type GameAction, type GameState } from '../../packages/engine/src/index.ts';
import { arbLevel } from './arbitraries.ts';

const arbGame = arbLevel().chain(level => fc.tuple(fc.constant(level), fc.array(fc.oneof(
    { arbitrary: fc.constantFrom(...level.objects.map(o => o.id)).map((objectId): GameAction => ({ type: 'SELECT_OBJECT', objectId })), weight: 8 },
    { arbitrary: fc.constant<GameAction>({ type: 'UNDO' }), weight: 1 },
    { arbitrary: fc.constant<GameAction>({ type: 'RESTART' }), weight: 1 }
), { maxLength: 60 })));

function checkInvariants(level: Level, prev: GameState, next: GameState, rejected: boolean): void {
    // 1. chaque objet est dans exactement un endroit logique
    for (const o of level.objects) {
        const places = [next.remainingObjectIds.includes(o.id), next.bufferObjectIds.includes(o.id), o.id in next.packedIn].filter(Boolean);
        expect(places, o.id).toHaveLength(1);
    }
    // 2. aucun dépassement de capacité
    for (const b of level.boxes) expect(next.boxFillCounts[b.id] ?? 0).toBeLessThanOrEqual(b.capacity);
    expect(next.bufferObjectIds.length).toBeLessThanOrEqual(level.rules.bufferCapacity);
    // 3. un coup refusé ne mute rien
    if (rejected) expect(next).toBe(prev);
    // 4. victoire conforme
    const allDone = next.remainingObjectIds.length === 0 && next.bufferObjectIds.length === 0 && next.completedBoxIds.length === level.boxes.length;
    expect(next.status === 'won').toBe(allDone);
    // 5. tout objet rangé est dans un carton de sa catégorie
    for (const [objectId, boxId] of Object.entries(next.packedIn)) {
        expect(level.boxes.find(b => b.id === boxId)?.category).toBe(level.objects.find(o => o.id === objectId)?.category);
    }
}

describe('invariants du moteur', () => {
    it('après chaque action, les cinq invariants tiennent', () => {
        fc.assert(fc.property(arbGame, ([level, actions]) => {
            let state = createInitialState(level);
            checkInvariants(level, state, state, false);
            for (const action of actions) {
                const t = applyAction(level, state, action);
                checkInvariants(level, state, t.state, t.events.some(e => e.type === 'ACTION_REJECTED'));
                state = t.state;
            }
        }), { numRuns: 300, seed: 20261118 });
    });
});
