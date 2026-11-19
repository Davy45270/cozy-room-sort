// Progression, parties en cours et réglages dans IndexedDB. Chaque écriture attend la fin de sa transaction.
import { applyAction, createInitialState, withMode, type GameState, type Mode } from '@cozy-room-sort/engine';
import type { Level } from '@cozy-room-sort/schemas';
import { isGameAction, signatureOf, type ReadableSave, type SignedSave } from '../game/save-signature.ts';
import type { ThemePreference } from '../theme/tokens.ts';

export interface LevelResult { stars: 1 | 2 | 3; bestBuffered: number }
export interface Settings { mode: Mode; theme: ThemePreference; sons: boolean; lastLevelId: string | null }
type StoreName = 'progress' | 'saves' | 'settings';

export type SaveLoadResult =
    | { kind: 'empty' | 'invalid' | 'level-changed'; save: undefined }
    | { kind: 'ready'; save: SignedSave };

export function saveLoadAnnouncement(result: SaveLoadResult): string | undefined {
    return result.kind === 'level-changed' ? 'Ce niveau a changé : la partie reprend au début.' : undefined;
}

export interface Store {
    progress(): Promise<Record<string, LevelResult>>;
    recordResult(levelId: string, result: LevelResult): Promise<void>;
    /** Lecture utilisée par l'écran avant le branchement de l'annonce. */
    readSave(levelId: string, rulesVersion: string): Promise<ReadableSave | null>;
    loadSave(level: Level, mode: Mode): Promise<SaveLoadResult>;
    writeSave(save: SignedSave): Promise<void>;
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
    && Array.isArray((v as ReadableSave).actions) && (v as ReadableSave).actions.every(isGameAction)
    && ((v as ReadableSave).levelSignature === undefined || typeof (v as ReadableSave).levelSignature === 'string');
/** Un journal antérieur à l'empreinte se reprend s'il se rejoue entièrement : aucun coup refusé par le moteur. */
const replaysCleanly = (level: Level, save: ReadableSave): boolean => {
    let state: GameState = createInitialState(level);
    for (const action of save.actions) {
        const transition = applyAction(level, state, action);
        if (transition.events.some(event => event.type === 'ACTION_REJECTED')) return false;
        state = transition.state;
    }
    return true;
};
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
        readSave: (levelId, rulesVersion) => readJournal(levelId, raw => {
            if (isSave(raw) && raw.levelId === levelId && raw.rulesVersion === rulesVersion) return { value: raw, discard: false };
            return { value: null, discard: raw !== undefined };
        }),
        loadSave(level, mode) {
            const played = withMode(level, mode);
            const levelSignature = signatureOf(played);
            return readJournal<SaveLoadResult>(level.id, raw => {
                if (raw === undefined) return { value: { kind: 'empty', save: undefined }, discard: false };
                if (!isSave(raw) || raw.levelId !== level.id) return { value: { kind: 'invalid', save: undefined }, discard: true };
                // Sans empreinte (version précédente) : repris s'il se rejoue sur le niveau actuel, signé à la prochaine écriture.
                const compatible = raw.levelSignature === undefined
                    ? raw.rulesVersion === level.rulesVersion && replaysCleanly(played, raw)
                    : raw.levelSignature === levelSignature;
                if (!compatible) return { value: { kind: 'level-changed', save: undefined }, discard: true };
                if (raw.rulesVersion !== level.rulesVersion) return { value: { kind: 'invalid', save: undefined }, discard: true };
                return { value: { kind: 'ready', save: { ...raw, levelSignature } }, discard: false };
            });
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
            return { ...DEFAULT_SETTINGS, ...value, sons: value?.sons === true };
        },
        writeSettings: settings => put('settings', 'settings', settings),
        writeRaw: put
    };
}
