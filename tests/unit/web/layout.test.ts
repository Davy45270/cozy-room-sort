import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Level } from '@cozy-room-sort/schemas';
import { catSpot, drawOrder, layoutRoom, MIN_SIZE, overlapRatio, roomView, type Bounds, type Placed } from '../../../apps/web/src/scene/layout.ts';

interface Provenance { id: string; dimensions: { w: number; h: number }; hitbox: { x: number; y: number; w: number; h: number } }
const provenance = new Map((JSON.parse(readFileSync('content/assets/provenance.json', 'utf8')) as Provenance[]).map(entry => [entry.id, entry]));
const boundsOf = (asset: string): Bounds => {
    const entry = provenance.get(asset);
    if (!entry) throw new Error(`Provenance absente : ${asset}`);
    const { dimensions: d, hitbox: b } = entry;
    return { x: b.x / d.w, y: b.y / d.h, w: b.w / d.w, h: b.h / d.h };
};
const box = (at: Placed, b: Bounds): Bounds => ({ x: at.x - at.size / 2 + b.x * at.size, y: at.y - at.size / 2 + b.y * at.size, w: b.w * at.size, h: b.h * at.size });

const levels = readdirSync('content/levels').map(f => JSON.parse(readFileSync(`content/levels/${f}`, 'utf8')) as Level);
const viewports = [{ width: 360, height: 300 }, { width: 412, height: 480 }, { width: 900, height: 620 }, { width: 1280, height: 700 }];

describe('projection de la pièce', () => {
    it('inscrit la vue carrée dans la zone de jeu avec une marge, centrée', () => {
        expect(roomView({ width: 390, height: 390 })).toEqual({ x: 195, y: 195, size: 390 * .94 });
        expect(roomView({ width: 880, height: 732 })).toEqual({ x: 440, y: 366, size: 732 * .94 });
        for (const viewport of [{ width: 960, height: 725 }, { width: 360, height: 360 }]) {
            const view = roomView(viewport);
            expect(view.y + view.size / 2).toBeLessThanOrEqual(viewport.height - 10);
            expect(view.y - view.size / 2).toBeGreaterThanOrEqual(10);
        }
    });

    it('en portrait étroit, prend la largeur (marge latérale ≤ 2 %) et se colle en haut de sa zone', () => {
        for (const viewport of [{ width: 390, height: 390 }, { width: 360, height: 360 }, { width: 390, height: 377 }]) {
            const view = roomView({ ...viewport, compact: true });
            const top = view.y - view.size / 2;
            expect(view.x).toBe(viewport.width / 2);
            if (viewport.height >= viewport.width) expect(viewport.width - view.size).toBeLessThanOrEqual(viewport.width * .04);
            expect(top).toBeGreaterThan(0);
            expect(top).toBeLessThanOrEqual(viewport.width * .02);
            expect(view.y + view.size / 2).toBeLessThanOrEqual(viewport.height);
        }
        // Une zone plus haute que large ne recentre pas la vue : le surplus reste sous la pièce.
        const tall = roomView({ width: 390, height: 520, compact: true });
        expect(tall.y - tall.size / 2).toBeLessThanOrEqual(390 * .02);
        expect(roomView({ width: 390, height: 520 }).y).toBe(260);
    });

    it.each(viewports)('$width×$height : le chat endormi n\'est recouvert par aucun objet des 20 niveaux', viewport => {
        expect(levels).toHaveLength(20);
        const cat = boundsOf('chat-dort');
        for (const level of levels) {
            const spot = catSpot(level, viewport, cat, boundsOf);
            const mine = box(spot, cat);
            const placed = layoutRoom(level, viewport);
            for (const object of level.objects) {
                const ratio = overlapRatio(mine, box(placed.get(object.id)!, boundsOf(object.asset)));
                expect(ratio, `${level.id} ${object.id}`).toBeLessThanOrEqual(.1);
            }
        }
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
