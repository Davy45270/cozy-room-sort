// @vitest-environment happy-dom
// Partie restaurée déjà finie (gagnée ou bloquée) : le dialogue de fin s'affiche au rechargement et doit recevoir le
// focus une fois l'écran inséré, comme quand la partie se termine en jouant. Montage comme main.ts : insertion, puis
// `mounted`. La scène Phaser et les sons sont remplacés ; contrôleur, moteur et sauvegarde sont réels.
import { afterEach, expect, it, vi } from 'vitest';
import { withMode } from '@cozy-room-sort/engine';
import type { Level } from '@cozy-room-sort/schemas';
import type { AppContext } from '../../../apps/web/src/app-context.ts';
import { levelById } from '../../../apps/web/src/content.ts';
import { signatureOf } from '../../../apps/web/src/game/save-signature.ts';
import { DEFAULT_SETTINGS, type Store } from '../../../apps/web/src/storage/db.ts';
import { BLOCKED_LEVEL, BLOCKED_MOVES } from '../../../apps/web/src/test-hooks.ts';

vi.mock('../../../apps/web/src/scene/room-scene.ts', () => ({
    PACK_MS: 180,
    reducedMotion: () => true,
    startRoom: () => ({ game: { destroy: () => undefined }, scene: { showHint: () => undefined } })
}));
// Aucun son, sur aucun appareil.
vi.mock('../../../apps/web/src/sons.ts', () => ({ playSound: () => Promise.resolve() }));

const { playScreen } = await import('../../../apps/web/src/screens/play.ts');

const context = (level: Level, moves: readonly string[]): AppContext => {
    const played = withMode(level, 'classique');
    const save = { levelId: level.id, rulesVersion: played.rulesVersion, levelSignature: signatureOf(played),
        actions: moves.map(objectId => ({ type: 'SELECT_OBJECT' as const, objectId })) };
    return {
        store: {
            loadSave: () => Promise.resolve({ kind: 'ready', save }),
            writeSave: () => Promise.resolve({ ok: true, revision: 1 }),
            recordResult: () => Promise.resolve()
        } as unknown as Store,
        settings: { ...DEFAULT_SETTINGS, lastLevelId: level.id },
        go: () => undefined,
        updateSettings: () => Promise.resolve()
    };
};

afterEach(() => { document.body.replaceChildren(); });

const cases: [string, string, () => readonly string[]][] = [
    ['gagnée', 'ecran-victoire', () => levelById('001-salon')?.meta?.solution ?? []],
    ['bloquée', 'ecran-bloque', () => BLOCKED_MOVES]
];

it.each(cases)('partie %s restaurée : le dialogue de fin prend le focus après l’insertion de l’écran', async (_name, testId, moves) => {
    const level = levelById(testId === 'ecran-bloque' ? BLOCKED_LEVEL : '001-salon');
    if (!level) throw new Error('niveau absent');
    const screen = await playScreen(context(level, moves()), level);
    document.body.append(screen.element);
    screen.mounted?.();
    const dialog = screen.element.querySelector(`[data-testid="${testId}"]`);
    expect(dialog).not.toBeNull();
    expect(document.activeElement?.tagName).toBe('BUTTON');
    expect(dialog?.contains(document.activeElement)).toBe(true);
    screen.dispose?.();
});
