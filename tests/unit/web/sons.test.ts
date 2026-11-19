// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { afterEach, expect, it, vi } from 'vitest';
import type { AppContext } from '../../../apps/web/src/app-context.ts';
import { settingsScreen } from '../../../apps/web/src/screens/settings.ts';
import { playSound } from '../../../apps/web/src/sons.ts';
import { openStore, type Settings } from '../../../apps/web/src/storage/db.ts';

afterEach(() => vi.unstubAllGlobals());

it('T10 : les sons sont coupés à l’installation et activés par un réglage persistant', async () => {
    const store = await openStore('cozy-test-sons');
    const settings = await store.settings();
    expect(settings.sons).toBe(false);
    const updateSettings = vi.fn((patch: Partial<Settings>) => store.writeSettings({ ...settings, ...patch }));
    const ctx: AppContext = { store, settings, go: vi.fn(), updateSettings };
    const { element } = settingsScreen(ctx, { screen: 'home' });
    const checkbox = element.querySelector<HTMLInputElement>('input[name="sons"]')!;
    expect(checkbox.checked).toBe(false);
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    expect(updateSettings).toHaveBeenCalledWith({ sons: true });
    await updateSettings.mock.results[0]?.value;
    expect((await store.settings()).sons).toBe(true);
});

it('T10 : aucun chargement et aucun play() quand les sons sont coupés', async () => {
    const play = vi.fn(() => Promise.resolve());
    const audio = vi.fn(class {
        canPlayType = () => 'probably';
        play = play;
    });
    const fetch = vi.fn(() => Promise.resolve(new Response(new Blob(['audio']))));
    vi.stubGlobal('Audio', audio);
    vi.stubGlobal('fetch', fetch);
    await playSound('selection', () => false);
    expect(audio).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(play).not.toHaveBeenCalled();
    await playSound('selection', () => true);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledTimes(1);
    await playSound('selection', () => false);
    expect(play).toHaveBeenCalledTimes(1);
});
