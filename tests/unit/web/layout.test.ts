import { createInitialState, isAccessible, applyAction, withMode } from '@cozy-room-sort/engine';
import { generateLevel } from '@cozy-room-sort/generator';
import { activeThemes } from '../../../content/themes/index.ts';
import { readFileSync, readdirSync } from 'node:fs';
import { pickObject } from '../../../apps/web/src/scene/pick-object.ts';
import { describe, expect, it } from 'vitest';
import type { Level } from '@cozy-room-sort/schemas';
import { catSpot, drawOrder, layoutRoom, overlapRatio, roomView, type Bounds, type Placed } from '../../../apps/web/src/scene/layout.ts';

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

    it('mesure le recouvrement sur des cas écrits à la main (oracle indépendant du placement)', () => {
        const r = (x: number, y: number, w: number, h: number): Bounds => ({ x, y, w, h });
        // Quart commun de deux carrés égaux : 5 × 5 sur 100.
        expect(overlapRatio(r(0, 0, 10, 10), r(5, 5, 10, 10))).toBeCloseTo(.25);
        // Petite boîte entièrement dans la grande : toute la petite est couverte.
        expect(overlapRatio(r(0, 0, 10, 10), r(2, 2, 4, 4))).toBeCloseTo(1);
        expect(overlapRatio(r(2, 2, 4, 4), r(0, 0, 10, 10))).toBeCloseTo(1);
        // Bande de 2 × 10 rapportée à la plus petite boîte (4 × 10).
        expect(overlapRatio(r(0, 0, 4, 10), r(2, 0, 10, 10))).toBeCloseTo(.5);
        // Recouvrement partiel sur les deux axes : 3 × 2 = 6, plus petite aire 4 × 5 = 20.
        expect(overlapRatio(r(1, 1, 4, 5), r(2, 4, 8, 8))).toBeCloseTo(.3);
        // Bords qui se touchent et boîtes disjointes : aucun recouvrement.
        expect(overlapRatio(r(0, 0, 10, 10), r(10, 0, 10, 10))).toBe(0);
        expect(overlapRatio(r(0, 0, 10, 10), r(0, 12, 10, 10))).toBe(0);
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

    it.each(viewports)('$width×$height : chaque objet reste dans la zone', viewport => {
        for (const level of levels) {
            const placed = layoutRoom(level, viewport);
            expect(placed.size).toBe(level.objects.length);
            for (const p of placed.values()) {
                expect(p.size).toBeGreaterThan(0);
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

it('les recouvrements et les couches expliquent tous les blocages du catalogue', () => {
    const errors = levels.flatMap(geometryErrors);
    expect(errors.slice(0, 10)).toEqual([]);
});

it('les recouvrements expliquent les blocages de cinquante niveaux générés', () => {
    const errors = Array.from({ length: 50 }, (_, i) => geometryErrors(generateLevel({
        theme: activeThemes[Math.floor(i / difficulties.length) % activeThemes.length]!.id,
        difficulty: difficulties[i % difficulties.length]!,
        seed: 42001 + i, index: i + 1
    }))).flat();
    expect(errors.slice(0, 10)).toEqual([]);
}, 60_000);

const difficulties = ['easy', 'medium', 'expert'] as const;
function geometryErrors(level: Level): string[] {
    const placed = layoutRoom(level, { width: 360, height: 360 });
    const objects = level.objects.map(o => ({ ...o, bounds: box(placed.get(o.id)!, boundsOf(o.asset)) }));
    const errors: string[] = [];
    for (const [i, a] of objects.entries()) for (const b of objects.slice(i + 1)) {
        const ratio = overlapRatio(a.bounds, b.bounds);
        const behind = a.blockedBy.includes(b.id) ? a : b.blockedBy.includes(a.id) ? b : undefined;
        const front = behind === a ? b : a;
        if (behind ? ratio < .25 || front.layer <= behind.layer : ratio >= .10) {
            errors.push(`${level.id} ${a.id} / ${b.id} : ${ratio.toFixed(3)} (couches ${a.layer}, ${b.layer})`);
        }
    }
    return errors;
}

// En portrait, la pièce occupe 100 vw. À 1280 px, la colonne latérale prend 320 px.
const touchViewports = [
    { window: '360×215 (zone de jeu)', width: 360, height: 215, half: 0 },
    { window: '360×215 (zone de jeu en portrait)', width: 360, height: 215, compact: true, half: 0 },
    // Plus petite zone de jeu du portrait très étroit (320 × 568) : `minmax(min(150px, 33dvh), …)` dans styles.css.
    { window: '320×150 (zone de jeu en portrait très étroit)', width: 320, height: 150, compact: true, half: 0 },
    { window: '390×844', width: 390, height: 390, compact: true, half: 22 },
    { window: '1280×800', width: 880, height: 730, half: 0 }
];

it.each(touchViewports)('$window : chaque objet accessible garde une zone propre après chaque coup', viewport => {
    const errors: string[] = [];
    for (const source of levels) {
        const level = withMode(source, 'classique');
        let state = createInitialState(level);
        const placed = layoutRoom(level, viewport);
        const objects = drawOrder(level).reverse().map(id => level.objects.find(object => object.id === id)!);
        const targets = objects.map(({ id, asset }) => ({ id, asset, at: placed.get(id)!, bounds: boundsOf(asset) }));
        const trace = level.meta?.solution ?? [];
        for (let move = 0; move <= trace.length; move++) {
            const accessible = targets.filter(target => isAccessible(level, state, target.id));
            const boxes = accessible.map(target => ({ id: target.id, bounds: box(target.at, target.bounds) }));
            for (const target of boxes) {
                const { x, y, w, h } = target.bounds;
                const { half } = viewport;
                const point = { x: x + w / 2, y: y + h / 2 };
                const farthest = Math.hypot(Math.max(0, half - w / 2), Math.max(0, half - h / 2));
                const clearance = Math.min(...boxes.filter(other => other !== target).map(({ bounds: b }) =>
                    Math.hypot(Math.max(0, b.x - point.x - half, point.x - half - b.x - b.w),
                        Math.max(0, b.y - point.y - half, point.y - half - b.y - b.h))));
                if (farthest > 22 || clearance <= farthest || point.x - half < 0 || point.y - half < 0
                    || point.x + half > viewport.width || point.y + half > viewport.height
                    || pickObject(point.x, point.y, accessible, () => true, () => true) !== target.id
                    || pickObject(point.x, point.y, accessible, () => false, () => true) !== target.id) {
                    errors.push(`${level.id}, coup ${move}, ${target.id} : marge ${clearance.toFixed(2)} px`);
                }
            }
            const id = trace[move];
            if (id !== undefined) {
                const transition = applyAction(level, state, { type: 'SELECT_OBJECT', objectId: id });
                expect(transition.state, `${level.id}, coup ${move + 1}`).not.toBe(state);
                state = transition.state;
            }
        }
        expect(state.status).toBe('won');
    }
    if (viewport.width === 360) {
        // Le toucher du 16ᵉ coup de ce niveau choisissait le coussin dessiné devant.
        expect(errors.filter(error => error.startsWith('011-chambre, coup 15, '))).toEqual([]);
    }
    expect(errors.slice(0, 10)).toEqual([]);
});


it('garde les mêmes recouvrements aux quatre tailles après chaque coup du catalogue', () => {
    const sizes = [
        { width: 360, height: 360 },
        { width: 360, height: 215, compact: true },
        { width: 390, height: 844, compact: true },
        { width: 1280, height: 800 }
    ];
    const errors: string[] = [];
    expect(levels).toHaveLength(20);
    for (const source of levels) {
        const level = withMode(source, 'classique');
        const trace = level.meta!.solution!;
        const reference = layoutRoom(level, { width: 360, height: 360 });
        const projections = sizes.map(viewport => layoutRoom(level, viewport));
        const pairs = level.objects.flatMap((a, i) => level.objects.slice(i + 1).map(b => {
            const ratio = (placed: Map<string, Placed>): number =>
                overlapRatio(box(placed.get(a.id)!, boundsOf(a.asset)), box(placed.get(b.id)!, boundsOf(b.asset)));
            const expected = ratio(reference);
            const actual = projections.map(ratio);
            const linked = a.blockedBy.includes(b.id) || b.blockedBy.includes(a.id);
            return { a: a.id, b: b.id, expected, actual, linked };
        }));
        let state = createInitialState(level);
        for (let move = 0; move <= trace.length; move++) {
            const remaining = new Set(state.remainingObjectIds);
            for (const { a, b, expected, actual, linked } of pairs) {
                if (!remaining.has(a) || !remaining.has(b)) continue;
                for (const [i, value] of actual.entries()) {
                    if (Math.abs(value - expected) > .005 || (linked ? value < .25 : value >= .10)) {
                        const { width, height } = sizes[i]!;
                        errors.push(`${width}×${height}, ${level.id}, coup ${move}, ${a} / ${b} : ${(expected * 100).toFixed(2)} % → ${(value * 100).toFixed(2)} %`);
                    }
                }
            }
            const id = trace[move];
            if (id !== undefined) state = applyAction(level, state, { type: 'SELECT_OBJECT', objectId: id }).state;
        }
        expect(state.status, level.id).toBe('won');
    }
    expect(errors.slice(0, 10)).toEqual([]);
});
