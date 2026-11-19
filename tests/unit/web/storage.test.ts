import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { withMode } from '@cozy-room-sort/engine';
import type { Level } from '@cozy-room-sort/schemas';
import { signatureOf } from '../../../apps/web/src/game/save-signature.ts';
import { beforeEach, describe, expect, it } from 'vitest';
import { openStore, saveLoadAnnouncement, type Store } from '../../../apps/web/src/storage/db.ts';

import { makeLevel } from '../engine/levels.ts';
import { createController, type ControllerDeps } from '../../../apps/web/src/game/controller.ts';
let store: Store;
let n = 0;
beforeEach(async () => { store = await openStore(`cozy-test-${n++}`); });

describe('stockage IndexedDB', () => {
    // Niveau minimal portant l'identifiant voulu ; journal signé pour ce niveau en mode classique.
    const levelNamed = (id: string): Level => ({ ...makeLevel({ boxes: [['a', 2]], objects: [['a1', 'a'], ['a2', 'a']] }), id });
    const signed = (level: Level, actions: { type: 'SELECT_OBJECT'; objectId: string }[] = [], rulesVersion: string = level.rulesVersion) =>
        ({ levelId: level.id, rulesVersion, levelSignature: signatureOf(withMode(level, 'classique')), actions });

    it('aller-retour des progrès, des parties et des réglages', async () => {
        const level = levelNamed('001-salon');
        await store.recordResult('001-salon', { stars: 2, bestBuffered: 3 });
        await store.writeSave(signed(level, [{ type: 'SELECT_OBJECT', objectId: 'a1' }]));
        await store.writeSettings({ mode: 'expert', theme: 'dark', sons: true, lastLevelId: '001-salon' });
        expect(await store.progress()).toEqual({ '001-salon': { stars: 2, bestBuffered: 3 } });
        const loaded = await store.loadSave(level, 'classique');
        expect(loaded.kind).toBe('ready');
        expect(loaded.save?.actions).toHaveLength(1);
        expect(await store.settings()).toEqual({ mode: 'expert', theme: 'dark', sons: true, lastLevelId: '001-salon' });
    });

    it('réglages par défaut quand rien n\'est écrit', async () => {
        expect(await store.settings()).toEqual({ mode: 'classique', theme: 'auto', sons: false, lastLevelId: null });
    });

    it('une meilleure note n\'est jamais écrasée par une moins bonne', async () => {
        await store.recordResult('002-salon', { stars: 3, bestBuffered: 1 });
        await store.recordResult('002-salon', { stars: 1, bestBuffered: 5 });
        expect((await store.progress())['002-salon']).toEqual({ stars: 3, bestBuffered: 1 });
        await store.recordResult('002-salon', { stars: 3, bestBuffered: 0 });
        expect((await store.progress())['002-salon']).toEqual({ stars: 3, bestBuffered: 0 });
    });

    it('une sauvegarde d\'une autre version des règles est rejetée et supprimée', async () => {
        const level = levelNamed('003-salon');
        await store.writeSave(signed(level, [], '0'));
        const loaded = await store.loadSave(level, 'classique');
        expect(loaded.kind).toBe('invalid');
        expect(loaded.save).toBeUndefined();
        expect((await store.loadSave(level, 'classique')).kind).toBe('empty');
    });

    it('une sauvegarde illisible est rejetée et supprimée', async () => {
        const level = levelNamed('004-salon');
        await store.writeRaw('saves', '004-salon', { levelId: '004-salon', actions: 'pas une liste' });
        expect((await store.loadSave(level, 'classique')).kind).toBe('invalid');
        expect((await store.loadSave(level, 'classique')).kind).toBe('empty');
    });

    it('effacer la partie d\'un niveau', async () => {
        const level = levelNamed('005-salon');
        await store.writeSave(signed(level));
        await store.clearSave('005-salon');
        expect((await store.loadSave(level, 'classique')).kind).toBe('empty');
    });

    it('changer de mode efface toutes les parties en cours, pas la progression', async () => {
        const level = levelNamed('006-salon');
        await store.writeSave(signed(level));
        await store.recordResult('006-salon', { stars: 1, bestBuffered: 4 });
        await store.clearAllSaves();
        expect((await store.loadSave(level, 'classique')).kind).toBe('empty');
        expect(Object.keys(await store.progress())).toEqual(['006-salon']);
    });
});

it.each(['same', 'changed', 'missing'] as const)('compatibilité du journal en base (%s)', async kind => {
    const level = makeLevel({ boxes: [['a', 2]], objects: [['a1', 'a'], ['a2', 'a']] });
    const revised = { ...level, rules: { ...level.rules, bufferCapacity: level.rules.bufferCapacity + 1 } };
    const deps: ControllerDeps = { save: value => store.writeSave(value), now: () => 0 };
    const original = createController(level, 'classique', deps);
    original.select('a1');
    await original.idle();
    await store.recordResult(level.id, { stars: 3, bestBuffered: 0 });
    if (kind === 'missing') {
        await store.writeRaw('saves', level.id, { levelId: level.id, rulesVersion: level.rulesVersion,
            actions: [{ type: 'SELECT_OBJECT', objectId: 'a1' }] });
    }
    const target = kind === 'changed' ? revised : { ...level, seed: 100, meta: { statesExplored: 123 } };
    // Le contrôleur ne rejoue qu'un journal à l'empreinte du niveau joué, quel que soit le chargement.
    const signedJournal = { levelId: level.id, rulesVersion: level.rulesVersion,
        levelSignature: signatureOf(withMode(level, 'classique')), actions: [{ type: 'SELECT_OBJECT', objectId: 'a1' } as const] };
    const interim = createController(target, 'classique', { save: () => Promise.resolve(), now: () => 0 }, signedJournal);
    expect(interim.state.moveCount).toBe(kind === 'changed' ? 0 : 1);

    // Le chargement destiné à l'écran annonce et supprime atomiquement un journal incompatible.
    const loaded = await store.loadSave(target, 'classique');
    const resumed = createController(target, 'classique', deps, loaded.save);
    // Sans empreinte mais rejouable sur le même contenu : la partie est reprise.
    const kept = kind !== 'changed';
    expect(resumed.state).toEqual(kept
        ? original.state
        : createController(target, 'classique', deps).state);
    expect(loaded.kind).toBe(kept ? 'ready' : 'level-changed');
    expect(saveLoadAnnouncement(loaded)).toBe(kept
        ? undefined
        : 'Ce niveau a changé : la partie reprend au début.');
    if (kept) expect(loaded.save?.levelSignature).toMatch(/^[0-9a-f]{16}$/);
    else expect((await store.loadSave(target, 'classique')).kind).toBe('empty');
    expect(await store.progress()).toEqual({ [level.id]: { stars: 3, bestBuffered: 0 } });
});

describe('journal sans empreinte (version précédente)', () => {
    const salon = JSON.parse(readFileSync('content/levels/002-salon.json', 'utf8')) as Level;
    const published = JSON.parse(readFileSync('tests/fixtures/sauvegardes/version-en-ligne-002-salon.json', 'utf8')) as
        { base: string; store: string; cle: string; valeur: { levelId: string; rulesVersion: string; actions: unknown[] } };
    const firstMove = salon.meta?.solution?.[0] ?? '';
    const deps: ControllerDeps = { save: value => store.writeSave(value), now: () => 0 };

    it('la fixture a la forme écrite par la version en ligne', () => {
        expect([published.base, published.store, published.cle]).toEqual(['cozy-room-sort', 'saves', salon.id]);
        expect(Object.keys(published.valeur).sort()).toEqual(['actions', 'levelId', 'rulesVersion']);
        expect(salon.objects.some(object => object.id === 'livre-1')).toBe(false);
    });

    it('la sauvegarde de la version en ligne, aux identifiants disparus, est écartée avec annonce', async () => {
        await store.writeRaw('saves', published.cle, published.valeur);
        const loaded = await store.loadSave(salon, 'classique');
        expect(loaded.kind).toBe('level-changed');
        expect(saveLoadAnnouncement(loaded)).toBe('Ce niveau a changé : la partie reprend au début.');
        expect((await store.loadSave(salon, 'classique')).kind).toBe('empty');
    });

    it('la même forme rejouable sur le niveau actuel est reprise au même coup, puis signée', async () => {
        expect(firstMove).toBe('pile-8');
        await store.writeRaw('saves', published.cle, { ...published.valeur, actions: [{ type: 'SELECT_OBJECT', objectId: firstMove }] });
        const loaded = await store.loadSave(salon, 'classique');
        expect(loaded.kind).toBe('ready');
        expect(saveLoadAnnouncement(loaded)).toBeUndefined();
        const resumed = createController(salon, 'classique', deps, loaded.save);
        expect(resumed.state.moveCount).toBe(1);
        resumed.select(salon.meta?.solution?.[1] ?? '');
        await resumed.idle();
        // Signé sur disque : sur un niveau aux règles changées, le même journal, encore rejouable, n'est plus repris
        // (un journal resté sans empreinte le serait).
        const revised = { ...salon, rules: { ...salon.rules, bufferCapacity: salon.rules.bufferCapacity + 1 } };
        expect((await store.loadSave(revised, 'classique')).kind).toBe('level-changed');
    });

    it('un journal sans empreinte dont un coup est refusé est écarté avec annonce', async () => {
        await store.writeRaw('saves', salon.id, { levelId: salon.id, rulesVersion: salon.rulesVersion,
            actions: [{ type: 'SELECT_OBJECT', objectId: firstMove }, { type: 'SELECT_OBJECT', objectId: firstMove }] });
        const loaded = await store.loadSave(salon, 'classique');
        expect(loaded.kind).toBe('level-changed');
        expect(saveLoadAnnouncement(loaded)).toBe('Ce niveau a changé : la partie reprend au début.');
    });

    it('un journal signé d\'une autre empreinte reste écarté, même rejouable', async () => {
        await store.writeRaw('saves', salon.id, { levelId: salon.id, rulesVersion: salon.rulesVersion, levelSignature: '0000000000000000',
            actions: [{ type: 'SELECT_OBJECT', objectId: firstMove }] });
        expect((await store.loadSave(salon, 'classique')).kind).toBe('level-changed');
    });
});

/** Copie de `items` avec un trou (indice jamais écrit) à `index` : la forme que rend `Array(n)` ou `[a, , b]`. */
function withHole(items: unknown[], index: number): unknown[] {
    const holed: unknown[] = [];
    items.forEach((item, i) => { holed[i < index ? i : i + 1] = item; });
    holed.length = Math.max(holed.length, index + 1);
    return holed;
}

describe('actions illisibles dans un journal', () => {
    const level = makeLevel({ boxes: [['a', 2]], objects: [['a1', 'a'], ['a2', 'a']] });
    const signature = signatureOf(withMode(level, 'classique'));
    it.each([
        ['null', [null]],
        ['nombre', [3]],
        ['type inconnu', [{ type: 'VOLER' }]],
        ['sans type', [{ objectId: 'a1' }]],
        ['identifiant non textuel', [{ type: 'SELECT_OBJECT', objectId: 4 }]],
        ['durée non numérique', [{ type: 'TICK', ms: '1000' }]],
        ['valide puis null', [{ type: 'SELECT_OBJECT', objectId: 'a1' }, null]],
        ['trou', Array(1)],
        ['valide puis trou', withHole([{ type: 'SELECT_OBJECT', objectId: 'a1' }, { type: 'SELECT_OBJECT', objectId: 'a2' }], 1)],
        ['durée NaN', [{ type: 'TICK', ms: NaN }]],
        ['durée infinie', [{ type: 'TICK', ms: Infinity }]],
        ['durée infinie négative', [{ type: 'SELECT_OBJECT', objectId: 'a1' }, { type: 'TICK', ms: -Infinity }]]
    ])('%s : écarté sans exception', async (_name, actions) => {
        await store.writeRaw('saves', level.id, { levelId: level.id, rulesVersion: level.rulesVersion, levelSignature: signature, actions });
        const loaded = await store.loadSave(level, 'classique');
        expect(loaded.kind).toBe('invalid');
        expect(() => createController(level, 'classique', { save: () => Promise.resolve(), now: () => 0 }, loaded.save)).not.toThrow();
        expect((await store.loadSave(level, 'classique')).kind).toBe('empty');
    });
});

describe('journal creux ou aux durées non finies, à la bonne empreinte, remis au contrôleur', () => {
    const level = makeLevel({ boxes: [['a', 2]], objects: [['a1', 'a'], ['a2', 'a']], rules: { timeLimitSeconds: 60 } });
    const levelSignature = signatureOf(withMode(level, 'classique'));
    it.each([
        ['trou', Array(1)],
        ['coup puis trou', withHole([{ type: 'SELECT_OBJECT', objectId: 'a1' }], 1)],
        ['durée NaN', [{ type: 'SELECT_OBJECT', objectId: 'a1' }, { type: 'TICK', ms: NaN }]],
        ['durée infinie', [{ type: 'SELECT_OBJECT', objectId: 'a1' }, { type: 'TICK', ms: Infinity }]]
    ])('%s : aucune exception, la partie repart au coup 0', (_name, actions) => {
        const saved = { levelId: level.id, rulesVersion: level.rulesVersion, levelSignature, actions } as never;
        let controller: ReturnType<typeof createController> | undefined;
        expect(() => { controller = createController(level, 'classique', { save: () => Promise.resolve(), now: () => 0 }, saved); }).not.toThrow();
        expect(controller?.state.moveCount).toBe(0);
        expect(controller?.state.elapsedMs).toBe(0);
        expect(controller?.state.status).toBe('playing');
    });

    it('le trou survit au clonage d’IndexedDB, puis le journal est écarté', async () => {
        await store.writeRaw('saves', level.id, { levelId: level.id, rulesVersion: level.rulesVersion, levelSignature, actions: Array(1) });
        const loaded = await store.loadSave(level, 'classique');
        expect(loaded.kind).toBe('invalid');
        const resumed = createController(level, 'classique', { save: () => Promise.resolve(), now: () => 0 }, loaded.save);
        expect(resumed.state.moveCount).toBe(0);
    });
});
