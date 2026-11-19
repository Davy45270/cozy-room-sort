import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { openStore, type Store } from '../../../apps/web/src/storage/db.ts';

let store: Store;
let n = 0;
beforeEach(async () => { store = await openStore(`cozy-test-${n++}`); });

describe('stockage IndexedDB', () => {
    it('aller-retour des progrès, des parties et des réglages', async () => {
        await store.recordResult('001-salon', { stars: 2, bestBuffered: 3 });
        await store.writeSave({ levelId: '001-salon', rulesVersion: '1', actions: [{ type: 'SELECT_OBJECT', objectId: 'a1' }] });
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
        await store.writeSave({ levelId: '003-salon', rulesVersion: '0', actions: [] });
        expect(await store.readSave('003-salon', '1')).toBeNull();
        expect(await store.readSave('003-salon', '0')).toBeNull();
    });

    it('une sauvegarde illisible est rejetée et supprimée', async () => {
        await store.writeRaw('saves', '004-salon', { levelId: '004-salon', actions: 'pas une liste' });
        expect(await store.readSave('004-salon', '1')).toBeNull();
    });

    it('effacer la partie d\'un niveau', async () => {
        await store.writeSave({ levelId: '005-salon', rulesVersion: '1', actions: [] });
        await store.clearSave('005-salon');
        expect(await store.readSave('005-salon', '1')).toBeNull();
    });

    it('changer de mode efface toutes les parties en cours, pas la progression', async () => {
        await store.writeSave({ levelId: '006-salon', rulesVersion: '1', actions: [] });
        await store.recordResult('006-salon', { stars: 1, bestBuffered: 4 });
        await store.clearAllSaves();
        expect(await store.readSave('006-salon', '1')).toBeNull();
        expect(Object.keys(await store.progress())).toEqual(['006-salon']);
    });
});
