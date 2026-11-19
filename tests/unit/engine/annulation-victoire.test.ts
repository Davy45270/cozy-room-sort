// Oracle (R-008) : en détente, le dernier coup reste annulable, y compris le coup gagnant ; seule une partie PERDUE
// refuse l'annulation. Aujourd'hui le réducteur refuse UNDO depuis `won` : le cas marqué `it.fails` est vert tant que
// le défaut existe. Quand le moteur sera corrigé, il deviendra rouge : il faudra alors le passer en `it`.
import { describe, expect, it } from 'vitest';
import { applyAction, createInitialState, withMode, type GameAction, type GameState } from '../../../packages/engine/src/index.ts';
import { makeLevel } from './levels.ts';

const sel = (...ids: string[]): GameAction[] => ids.map(objectId => ({ type: 'SELECT_OBJECT', objectId }));
const play = (level: ReturnType<typeof makeLevel>, actions: readonly GameAction[]) =>
    actions.reduce<{ state: GameState; rejected: boolean }>((acc, a) => {
        const t = applyAction(level, acc.state, a);
        return { state: t.state, rejected: t.events.some(e => e.type === 'ACTION_REJECTED') };
    }, { state: createInitialState(level), rejected: false });

const detente = withMode(makeLevel({ boxes: [['a', 2]], objects: [['a1', 'a'], ['a2', 'a']] }), 'detente');
// Détente chronométrée : la partie est perdue au temps alors qu'une annulation resterait disponible.
const chrono = withMode(makeLevel({ boxes: [['a', 2]], objects: [['a1', 'a'], ['a2', 'a']], rules: { timeLimitSeconds: 1 } }), 'detente');
const late: GameAction = { type: 'TICK', ms: 5000 };

describe('annulation et fin de partie (R-008)', () => {
    it('préparation de l’oracle : une partie de détente gagnée, une autre perdue au temps', () => {
        expect(play(detente, sel('a1', 'a2')).state.status).toBe('won');
        expect(play(chrono, [...sel('a1'), late]).state.status).toBe('lost');
    });

    it.fails('en détente, le coup gagnant s’annule : la partie revient en cours, l’objet rangé revient dans la pièce', () => {
        const { state, rejected } = play(detente, [...sel('a1', 'a2'), { type: 'UNDO' }]);
        expect(rejected).toBe(false);
        expect(state.status).toBe('playing');
        expect(state.remainingObjectIds).toContain('a2');
    });

    it('une partie perdue refuse l’annulation, sans changer d’état', () => {
        const lost = play(chrono, [...sel('a1'), late]).state;
        expect(lost.history.length).toBeGreaterThan(0);
        const t = applyAction(chrono, lost, { type: 'UNDO' });
        expect(t.events.some(e => e.type === 'ACTION_REJECTED')).toBe(true);
        expect(t.state).toBe(lost);
    });
});
