import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { openStore, saveLoadAnnouncement, type Store } from '../../../apps/web/src/storage/db.ts';

import { makeLevel } from '../engine/levels.ts';
import { createController, type ControllerDeps } from '../../../apps/web/src/game/controller.ts';
let store: Store;
let n = 0;
beforeEach(async () => { store = await openStore(`cozy-test-${n++}`); });

describe('stockage IndexedDB', () => {
    it('aller-retour des progrès, des parties et des réglages', async () => {
        await store.recordResult('001-salon', { stars: 2, bestBuffered: 3 });
        await store.writeSave({ levelId: '001-salon', rulesVersion: '1', levelSignature: 'signature', actions: [{ type: 'SELECT_OBJECT', objectId: 'a1' }] });
        await store.writeSettings({ mode: 'expert', theme: 'dark', sons: true, lastLevelId: '001-salon' });
        expect(await store.progress()).toEqual({ '001-salon': { stars: 2, bestBuffered: 3 } });
        expect((await store.readSave('001-salon', '1'))?.actions).toHaveLength(1);
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
        await store.writeSave({ levelId: '003-salon', rulesVersion: '0', levelSignature: 'signature', actions: [] });
        expect(await store.readSave('003-salon', '1')).toBeNull();
        expect(await store.readSave('003-salon', '0')).toBeNull();
    });

    it('une sauvegarde illisible est rejetée et supprimée', async () => {
        await store.writeRaw('saves', '004-salon', { levelId: '004-salon', actions: 'pas une liste' });
        expect(await store.readSave('004-salon', '1')).toBeNull();
    });

    it('effacer la partie d\'un niveau', async () => {
        await store.writeSave({ levelId: '005-salon', rulesVersion: '1', levelSignature: 'signature', actions: [] });
        await store.clearSave('005-salon');
        expect(await store.readSave('005-salon', '1')).toBeNull();
    });

    it('changer de mode efface toutes les parties en cours, pas la progression', async () => {
        await store.writeSave({ levelId: '006-salon', rulesVersion: '1', levelSignature: 'signature', actions: [] });
        await store.recordResult('006-salon', { stars: 1, bestBuffered: 4 });
        await store.clearAllSaves();
        expect(await store.readSave('006-salon', '1')).toBeNull();
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
    // Le chemin de l'écran actuel vérifie déjà la signature avant tout rejeu.
    const saved = await store.readSave(target.id, target.rulesVersion);
    const interim = createController(target, 'classique', deps, saved ?? undefined);
    expect(interim.state.moveCount).toBe(kind === 'same' ? 1 : 0);

    // Le chargement destiné à l'écran annonce et supprime atomiquement un journal incompatible.
    const loaded = await store.loadSave(target, 'classique');
    const resumed = createController(target, 'classique', deps, loaded.save);
    expect(resumed.state).toEqual(kind === 'same'
        ? original.state
        : createController(target, 'classique', deps).state);
    expect(loaded.kind).toBe(kind === 'same' ? 'ready' : 'level-changed');
    expect(saveLoadAnnouncement(loaded)).toBe(kind === 'same'
        ? undefined
        : 'Ce niveau a changé : la partie reprend au début.');
    if (kind === 'same') expect(loaded.save?.levelSignature).toMatch(/^[0-9a-f]{16}$/);
    else expect((await store.loadSave(target, 'classique')).kind).toBe('empty');
    expect(await store.progress()).toEqual({ [level.id]: { stars: 3, bestBuffered: 0 } });
});
