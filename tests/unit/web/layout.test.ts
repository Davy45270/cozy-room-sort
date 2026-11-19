import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Level } from '@cozy-room-sort/schemas';
import { drawOrder, layoutRoom, MIN_SIZE, roomView } from '../../../apps/web/src/scene/layout.ts';

const levels = readdirSync('content/levels').map(f => JSON.parse(readFileSync(`content/levels/${f}`, 'utf8')) as Level);
const viewports = [{ width: 360, height: 300 }, { width: 412, height: 480 }, { width: 900, height: 620 }, { width: 1280, height: 700 }];

describe('projection de la pièce', () => {
    it('inscrit la plus grande vue carrée dans la zone de jeu', () => {
        expect(roomView({ width: 390, height: 390 })).toEqual({ x: 195, y: 195, size: 390 });
        expect(roomView({ width: 880, height: 732 })).toEqual({ x: 440, y: 366, size: 732 });
    });

    it.each(viewports)('$width×$height : chaque objet reste dans la zone, à 44 px au moins', viewport => {
        for (const level of levels) {
            const placed = layoutRoom(level, viewport);
            expect(placed.size).toBe(level.objects.length);
            for (const p of placed.values()) {
                expect(p.size).toBeGreaterThanOrEqual(MIN_SIZE);
                expect(p.x - p.size / 2).toBeGreaterThanOrEqual(0);
                expect(p.x + p.size / 2).toBeLessThanOrEqual(viewport.width);
                expect(p.y - p.size / 2).toBeGreaterThanOrEqual(0);
                expect(p.y + p.size / 2).toBeLessThanOrEqual(viewport.height);
            }
        }
    });

    it('stable : même niveau, même zone, même projection', () => {
        const level = levels[0] as Level;
        expect([...layoutRoom(level, viewports[1]!)]).toEqual([...layoutRoom(level, viewports[1]!)]);
    });

    it('un bloqueur est dessiné après (au-dessus de) l\'objet qu\'il recouvre', () => {
        for (const level of levels) {
            const order = drawOrder(level);
            for (const o of level.objects) for (const b of o.blockedBy) expect(order.indexOf(b), `${level.id} ${b} sur ${o.id}`).toBeGreaterThan(order.indexOf(o.id));
        }
    });
});
