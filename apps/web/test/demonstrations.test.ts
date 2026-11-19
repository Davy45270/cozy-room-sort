// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import type { Level } from '@cozy-room-sort/schemas';
import { expect, it } from 'vitest';
import { createController } from '../src/game/controller.ts';
import { BLOCKED_LEVEL, BLOCKED_MOVES, demonstration } from '../src/test-hooks.ts';

it('réserve les démonstrations à la valeur de test explicite', () => {
    try {
        window.history.replaceState(null, '', '/?test=0&demo=gagner');
        expect(demonstration()).toBeUndefined();
        window.history.replaceState(null, '', '/?test=1&demo=bloquer');
        expect(demonstration()).toBe('bloquer');
        window.history.replaceState(null, '', '/?test=1&demo=gagner');
        expect(demonstration()).toBe('gagner');
    } finally { window.history.replaceState(null, '', '/'); }
});

it('joue les coups du blocage un par un jusqu’à l’impasse', () => {
    const level = JSON.parse(readFileSync(`content/levels/${BLOCKED_LEVEL}.json`, 'utf8')) as Level;
    const controller = createController(level, 'classique', { save: () => Promise.resolve(), now: () => 0 });
    for (const [index, id] of BLOCKED_MOVES.entries()) {
        expect(controller.state.status).toBe('playing');
        controller.select(id);
        expect(controller.state.moveCount).toBe(index + 1);
    }
    expect(controller.state.status).toBe('blocked');
});
