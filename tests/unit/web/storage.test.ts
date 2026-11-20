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

    it('un journal écrit sous les règles 1 reprend au début, avec annonce ; les étoiles restent', async () => {
        const level = levelNamed('004-salon');
        const rules1: Level = { ...level, rulesVersion: '1' as unknown as Level['rulesVersion'] };
        await store.recordResult('004-salon', { stars: 2, bestBuffered: 2 });
        await store.writeSave(signed(rules1, [{ type: 'SELECT_OBJECT', objectId: 'a1' }], '1'));
        const loaded = await store.loadSave(level, 'classique');
        expect(loaded.kind).toBe('level-changed');
        expect(loaded.save).toBeUndefined();
        expect(saveLoadAnnouncement(loaded)).toBe('Ce niveau a changé : la partie reprend au début.');
        expect((await store.progress())['004-salon']).toEqual({ stars: 2, bestBuffered: 2 });
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
    const deps: ControllerDeps = { save: async value => { await store.writeSave(value); }, now: () => 0 };
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
    // Seul un journal à l'empreinte du niveau est repris ; sans empreinte, il est traité comme un niveau changé.
    const kept = kind === 'same';
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
    const deps: ControllerDeps = { save: async value => { await store.writeSave(value); }, now: () => 0 };

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

    it('la même forme, encore rejouable sur le niveau actuel, est écartée avec annonce ; les étoiles restent', async () => {
        expect(firstMove).toBe('pile-8');
        await store.recordResult(salon.id, { stars: 2, bestBuffered: 4 });
        await store.writeRaw('saves', published.cle, { ...published.valeur, actions: [{ type: 'SELECT_OBJECT', objectId: firstMove }] });
        const loaded = await store.loadSave(salon, 'classique');
        expect(loaded.kind).toBe('level-changed');
        expect(saveLoadAnnouncement(loaded)).toBe('Ce niveau a changé : la partie reprend au début.');
        const resumed = createController(salon, 'classique', deps, loaded.save);
        expect(resumed.state.moveCount).toBe(0);
        expect((await store.loadSave(salon, 'classique')).kind).toBe('empty');
        expect(await store.progress()).toEqual({ [salon.id]: { stars: 2, bestBuffered: 4 } });
    });

    it('mêmes identifiants, cartons dans l’autre ordre : le journal sans empreinte ne restaure aucun état', async () => {
        // Un seul carton actif : le premier coup range a1 sur le niveau d'origine, le met au tampon sur l'autre.
        const original = { ...makeLevel({ boxes: [['a', 1], ['b', 1]], objects: [['a1', 'a'], ['b1', 'b']] }), id: '090-salon' };
        const swapped = { ...original, boxes: [...original.boxes].reverse() };
        const journal = [{ type: 'SELECT_OBJECT', objectId: 'a1' } as const];
        const offline: ControllerDeps = { save: () => Promise.resolve(), now: () => 0 };
        const onOriginal = createController(original, 'classique', offline);
        onOriginal.select('a1');
        const onSwapped = createController(swapped, 'classique', offline);
        onSwapped.select('a1');
        expect(onOriginal.state.packedIn).toEqual({ a1: 'box-1' });
        expect(onSwapped.state.bufferObjectIds).toEqual(['a1']);
        await store.writeRaw('saves', swapped.id, { levelId: swapped.id, rulesVersion: swapped.rulesVersion, actions: journal });
        const loaded = await store.loadSave(swapped, 'classique');
        expect(loaded.kind).toBe('level-changed');
        expect(loaded.save).toBeUndefined();
        expect(createController(swapped, 'classique', offline, loaded.save).state).toEqual(createController(swapped, 'classique', offline).state);
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

describe('empreinte du niveau', () => {
    const base = makeLevel({ boxes: [['a', 2]], objects: [['a1', 'a'], ['a2', 'a']], rules: { timeLimitSeconds: 60 } });

    it('changer la seule limite de temps change l’empreinte, et le journal signé est écarté avec annonce', async () => {
        const shorter = { ...base, rules: { ...base.rules, timeLimitSeconds: 30 } };
        const untimed = { ...base, rules: { ...base.rules, timeLimitSeconds: null } };
        const signatures = [base, shorter, untimed].map(level => signatureOf(withMode(level, 'classique')));
        expect(new Set(signatures).size).toBe(3);
        await store.writeRaw('saves', base.id, { levelId: base.id, rulesVersion: base.rulesVersion, levelSignature: signatures[0],
            actions: [{ type: 'SELECT_OBJECT', objectId: 'a1' }, { type: 'TICK', ms: 40_000 }] });
        const loaded = await store.loadSave(shorter, 'classique');
        expect(loaded.kind).toBe('level-changed');
        expect(saveLoadAnnouncement(loaded)).toBe('Ce niveau a changé : la partie reprend au début.');
    });
});

describe('deux onglets sur le même niveau', () => {
    // Chaque onglet ouvre sa propre connexion et part de la révision qu'il a lue. Une écriture partie d'une révision
    // dépassée (l'autre onglet a écrit depuis) est refusée : la sauvegarde la plus récente n'est jamais écrasée.
    const level: Level = { ...makeLevel({ boxes: [['a', 3]], objects: [['a1', 'a'], ['a2', 'a'], ['a3', 'a']] }), id: '001-salon' };
    const journal = (...ids: string[]) => ({ levelId: level.id, rulesVersion: level.rulesVersion,
        levelSignature: signatureOf(withMode(level, 'classique')), actions: ids.map(objectId => ({ type: 'SELECT_OBJECT' as const, objectId })) });
    // Révision lue : celle de la partie reprise, ou celle d'une partie laissée en place (autre mode).
    const revisionOf = (loaded: Awaited<ReturnType<Store['loadSave']>>): number => (loaded.save ? loaded.save.revision : loaded.revision) ?? 0;

    it('un onglet dans un autre mode n’efface pas la partie de l’autre onglet en l’ouvrant', async () => {
        const name = `cozy-onglets-${n++}`;
        const [a, b] = [await openStore(name), await openStore(name)];
        // A joue en Détente ; B, resté en Classique, ouvre le même niveau sans jouer.
        const detente = { ...journal('a1'), levelSignature: signatureOf(withMode(level, 'detente')) };
        const first = await a.writeSave(detente, revisionOf(await a.loadSave(level, 'detente')));
        expect(first.ok).toBe(true);
        const seen = await b.loadSave(level, 'classique');
        expect(seen.save).toBeUndefined();
        expect(saveLoadAnnouncement(seen)).toBeUndefined();
        // La partie Détente est intacte et A continue d'écrire.
        const kept = await a.loadSave(level, 'detente');
        expect(kept.save?.actions).toHaveLength(1);
        if (!first.ok) return;
        expect((await a.writeSave({ ...detente, actions: [...detente.actions, { type: 'SELECT_OBJECT', objectId: 'a2' }] }, first.revision)).ok).toBe(true);
        // Si B joue ensuite, il écrit par-dessus à partir de la révision qu'il a lue : c'est alors A qui rechargera.
        expect((await b.writeSave(journal('a1'), revisionOf(await b.loadSave(level, 'classique')))).ok).toBe(true);
    });

    it('l’onglet resté en arrière ne fait pas reculer la sauvegarde, et l’apprend', async () => {
        const name = `cozy-onglets-${n++}`;
        const [a, b] = [await openStore(name), await openStore(name)];
        let ra = revisionOf(await a.loadSave(level, 'classique'));
        const rb = revisionOf(await b.loadSave(level, 'classique'));
        for (const ids of [['a1'], ['a1', 'a2']]) {
            const written = await a.writeSave(journal(...ids), ra);
            expect(written.ok).toBe(true);
            if (written.ok) ra = written.revision;
        }
        const late = await b.writeSave(journal('a3'), rb);
        expect(late.ok).toBe(false);
        const reloaded = await a.loadSave(level, 'classique');
        expect(reloaded.save?.actions.map(action => action.type === 'SELECT_OBJECT' ? action.objectId : '')).toEqual(['a1', 'a2']);
        expect(revisionOf(reloaded)).toBe(ra);
        // Rechargé à la dernière révision, l'onglet B peut reprendre la main.
        const resumed = await b.writeSave(journal('a1', 'a2', 'a3'), revisionOf(await b.loadSave(level, 'classique')));
        expect(resumed.ok).toBe(true);
    });
});
