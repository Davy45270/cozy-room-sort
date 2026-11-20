// Progression, parties en cours et réglages dans IndexedDB. Chaque écriture attend la fin de sa transaction.
import { withMode, type Mode } from '@cozy-room-sort/engine';
import type { Level } from '@cozy-room-sort/schemas';
import { isGameJournal, signatureOf, type ReadableSave, type SignedSave } from '../game/save-signature.ts';
import type { ThemePreference } from '../theme/tokens.ts';

export interface LevelResult { stars: 1 | 2 | 3; bestBuffered: number }
export interface Settings { mode: Mode; theme: ThemePreference; sons: boolean; lastLevelId: string | null }
type StoreName = 'progress' | 'saves' | 'settings';

/** Écriture d'une partie : refusée si un autre onglet a écrit depuis la révision lue (`expected`). */
export type SaveWrite = { ok: true; revision: number } | { ok: false };

/**
 * `other-mode` : partie du même niveau jouée dans un autre mode (un autre onglet) ; elle n'est ni reprise ni effacée à la
 * lecture. `revision` : révision stockée, point de départ des écritures de cet onglet (voir `writeSave`).
 */
export type SaveLoadResult =
    | { kind: 'empty' | 'invalid' | 'level-changed'; save: undefined; revision?: number }
    | { kind: 'other-mode'; save: undefined; revision: number }
    | { kind: 'ready'; save: SignedSave };

export function saveLoadAnnouncement(result: SaveLoadResult): string | undefined {
    return result.kind === 'level-changed' ? 'Ce niveau a changé : la partie reprend au début.' : undefined;
}

export interface Store {
    progress(): Promise<Record<string, LevelResult>>;
    recordResult(levelId: string, result: LevelResult): Promise<void>;
    loadSave(level: Level, mode: Mode): Promise<SaveLoadResult>;
    /** Sans `expected`, écrit sans condition ; avec, seulement si la révision stockée vaut encore `expected`. */
    writeSave(save: SignedSave, expected?: number): Promise<SaveWrite>;
    clearSave(levelId: string): Promise<void>;
    clearAllSaves(): Promise<void>;
    settings(): Promise<Settings>;
    writeSettings(settings: Settings): Promise<void>;
    /** Écriture brute, pour les tests de robustesse. */
    writeRaw(store: StoreName, key: string, value: unknown): Promise<void>;
}

export const DEFAULT_SETTINGS: Settings = { mode: 'classique', theme: 'auto', sons: false, lastLevelId: null };

const done = (tx: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('transaction IndexedDB en échec'));
    tx.onabort = () => reject(tx.error ?? new Error('transaction IndexedDB annulée'));
});
const result = <T>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('requête IndexedDB en échec'));
});

const isSave = (v: unknown): v is ReadableSave => typeof v === 'object' && v !== null
    && typeof (v as ReadableSave).levelId === 'string' && typeof (v as ReadableSave).rulesVersion === 'string'
    && isGameJournal((v as ReadableSave).actions)
    && ((v as ReadableSave).levelSignature === undefined || typeof (v as ReadableSave).levelSignature === 'string')
    && ((v as ReadableSave).revision === undefined || Number.isSafeInteger((v as ReadableSave).revision));
const revisionOf = (v: unknown): number => isSave(v) ? v.revision ?? 0 : 0;
const MODES: readonly Mode[] = ['detente', 'classique', 'expert'];
const better = (a: LevelResult, b: LevelResult): boolean => a.stars > b.stars || (a.stars === b.stars && a.bestBuffered < b.bestBuffered);

export function openStore(name = 'cozy-room-sort'): Promise<Store> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(name, 1);
        request.onupgradeneeded = () => {
            for (const s of ['progress', 'saves', 'settings'] as const) request.result.createObjectStore(s);
        };
        request.onerror = () => reject(request.error ?? new Error('IndexedDB indisponible'));
        request.onsuccess = () => resolve(wrap(request.result));
    });
}

function wrap(db: IDBDatabase): Store {
    const get = async (store: StoreName, key: string): Promise<unknown> => result(db.transaction(store).objectStore(store).get(key));
    const put = async (store: StoreName, key: string, value: unknown): Promise<void> => {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).put(value, key);
        await done(tx);
    };
    const remove = async (store: StoreName, key: string): Promise<void> => {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).delete(key);
        await done(tx);
    };
    // Lecture et effacement conditionnel dans la même transaction : une autre écriture ne peut pas s'intercaler.
    const readJournal = async <T>(levelId: string, check: (value: unknown) => { value: T; discard: boolean }): Promise<T> => {
        const tx = db.transaction('saves', 'readwrite');
        const os = tx.objectStore('saves');
        const checked = result(os.get(levelId)).then(raw => {
            const evaluated = check(raw);
            if (evaluated.discard) os.delete(levelId);
            return evaluated.value;
        });
        const [value] = await Promise.all([checked, done(tx)]);
        return value;
    };
    return {
        async progress() {
            const tx = db.transaction('progress');
            const os = tx.objectStore('progress');
            const [keys, values] = await Promise.all([result(os.getAllKeys()), result(os.getAll())]);
            return Object.fromEntries(keys.map((k, i) => [k as string, values[i] as LevelResult]));
        },
        async recordResult(levelId, next) {
            const tx = db.transaction('progress', 'readwrite');
            const os = tx.objectStore('progress');
            const previous = await result(os.get(levelId)) as LevelResult | undefined;
            if (previous === undefined || better(next, previous)) os.put(next, levelId);
            await done(tx);
        },
        loadSave(level, mode) {
            const levelSignature = signatureOf(withMode(level, mode));
            return readJournal<SaveLoadResult>(level.id, raw => {
                if (raw === undefined) return { value: { kind: 'empty', save: undefined }, discard: false };
                if (!isSave(raw) || raw.levelId !== level.id) return { value: { kind: 'invalid', save: undefined }, discard: true };
                // Sans empreinte (version précédente) : traité comme un niveau changé. Un journal qui se rejoue encore peut
                // donner un autre état (mêmes identifiants, cartons dans un autre ordre) ; rien ne prouve qu'il est le même.
                if (raw.levelSignature !== levelSignature) {
                    const otherMode = MODES.some(other => other !== mode && raw.levelSignature === signatureOf(withMode(level, other)));
                    if (otherMode) return { value: { kind: 'other-mode', save: undefined, revision: revisionOf(raw) }, discard: false };
                    return { value: { kind: 'level-changed', save: undefined }, discard: true };
                }
                if (raw.rulesVersion !== level.rulesVersion) return { value: { kind: 'invalid', save: undefined }, discard: true };
                return { value: { kind: 'ready', save: { ...raw, levelSignature } }, discard: false };
            });
        },
        async writeSave(save, expected) {
            // Lecture et écriture dans la même transaction : deux onglets ne peuvent pas s'intercaler.
            const tx = db.transaction('saves', 'readwrite');
            const os = tx.objectStore('saves');
            const written = result(os.get(save.levelId)).then((stored): SaveWrite => {
                const current = revisionOf(stored);
                if (expected !== undefined && current !== expected) return { ok: false };
                os.put({ ...save, revision: current + 1 }, save.levelId);
                return { ok: true, revision: current + 1 };
            });
            const [outcome] = await Promise.all([written, done(tx)]);
            return outcome;
        },
        clearSave: levelId => remove('saves', levelId),
        async clearAllSaves() {
            const tx = db.transaction('saves', 'readwrite');
            tx.objectStore('saves').clear();
            await done(tx);
        },
        async settings() {
            const value = await get('settings', 'settings') as Partial<Settings> | undefined;
            return { ...DEFAULT_SETTINGS, ...value, sons: value?.sons === true };
        },
        writeSettings: settings => put('settings', 'settings', settings),
        writeRaw: put
    };
}
