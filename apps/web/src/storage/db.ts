// Progression, parties en cours et réglages dans IndexedDB. Chaque écriture attend la fin de sa transaction.
import type { Mode, SavedGame } from '@cozy-room-sort/engine';
import type { ThemePreference } from '../theme/tokens.ts';

export interface LevelResult { stars: 1 | 2 | 3; bestBuffered: number }
export interface Settings { mode: Mode; theme: ThemePreference; lastLevelId: string | null }
type StoreName = 'progress' | 'saves' | 'settings';

export interface Store {
    progress(): Promise<Record<string, LevelResult>>;
    recordResult(levelId: string, result: LevelResult): Promise<void>;
    readSave(levelId: string, rulesVersion: string): Promise<SavedGame | null>;
    writeSave(save: SavedGame): Promise<void>;
    clearSave(levelId: string): Promise<void>;
    clearAllSaves(): Promise<void>;
    settings(): Promise<Settings>;
    writeSettings(settings: Settings): Promise<void>;
    /** Écriture brute, pour les tests de robustesse. */
    writeRaw(store: StoreName, key: string, value: unknown): Promise<void>;
}

export const DEFAULT_SETTINGS: Settings = { mode: 'classique', theme: 'auto', lastLevelId: null };

const done = (tx: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('transaction IndexedDB en échec'));
    tx.onabort = () => reject(tx.error ?? new Error('transaction IndexedDB annulée'));
});
const result = <T>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('requête IndexedDB en échec'));
});

const isSave = (v: unknown): v is SavedGame => typeof v === 'object' && v !== null
    && typeof (v as SavedGame).levelId === 'string' && typeof (v as SavedGame).rulesVersion === 'string' && Array.isArray((v as SavedGame).actions);
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
        async readSave(levelId, rulesVersion) {
            const value = await get('saves', levelId);
            if (value === undefined) return null;
            if (!isSave(value) || value.rulesVersion !== rulesVersion || value.levelId !== levelId) {
                await remove('saves', levelId);
                return null;
            }
            return value;
        },
        writeSave: save => put('saves', save.levelId, save),
        clearSave: levelId => remove('saves', levelId),
        async clearAllSaves() {
            const tx = db.transaction('saves', 'readwrite');
            tx.objectStore('saves').clear();
            await done(tx);
        },
        async settings() {
            const value = await get('settings', 'settings') as Partial<Settings> | undefined;
            return { ...DEFAULT_SETTINGS, ...value };
        },
        writeSettings: settings => put('settings', 'settings', settings),
        writeRaw: put
    };
}
