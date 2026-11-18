import { registerSW } from 'virtual:pwa-register';
import { levelById } from './content.ts';
import type { AppContext, Route, Screen } from './app-context.ts';
import { homeScreen } from './screens/home.ts';
import { levelsScreen } from './screens/levels.ts';
import { playScreen } from './screens/play.ts';
import { settingsScreen } from './screens/settings.ts';
import { DEFAULT_SETTINGS, openStore, type Settings } from './storage/db.ts';
import { applyTheme, themeStylesheet } from './theme/apply.ts';
import type { Tone } from './theme/tokens.ts';
import './styles.css';

async function boot(): Promise<void> {
    const style = document.createElement('style');
    style.textContent = themeStylesheet();
    document.head.prepend(style);
    const store = await openStore();
    let settings: Settings = await store.settings().catch(() => DEFAULT_SETTINGS);
    let tone: Tone = applyTheme(settings.theme);
    const toneListeners = new Set<() => void>();
    const setTone = (): void => {
        const next = applyTheme(settings.theme);
        if (next !== tone) { tone = next; for (const l of toneListeners) l(); }
    };
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', setTone);

    const root = document.getElementById('app') as HTMLElement;
    let current: Screen | undefined;
    let generation = 0;
    const ctx: AppContext = {
        store,
        get settings() { return settings; },
        tone: () => tone,
        onTone: l => { toneListeners.add(l); return () => { toneListeners.delete(l); }; },
        async updateSettings(next) {
            const modeChanged = next.mode !== undefined && next.mode !== settings.mode;
            settings = { ...settings, ...next };
            await store.writeSettings(settings);
            if (modeChanged) await store.clearAllSaves();
            setTone();
        },
        go: route => { void show(route); }
    };
    const build = (route: Route): Promise<Screen> | Screen => {
        if (route.screen === 'home') return homeScreen(ctx);
        if (route.screen === 'levels') return levelsScreen(ctx);
        if (route.screen === 'settings') return settingsScreen(ctx, route.back);
        return playScreen(ctx, route.level);
    };
    const show = async (route: Route): Promise<void> => {
        const mine = ++generation;
        const screen = await build(route);
        if (mine !== generation) { screen.dispose?.(); return; }
        current?.dispose?.();
        current = screen;
        root.replaceChildren(screen.element);
        screen.mounted?.();
        screen.element.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
        history.replaceState(null, '', route.screen === 'play' ? `#${route.level.id}` : `#${route.screen}`);
    };
    const fromHash = levelById(location.hash.slice(1));
    await show(fromHash ? { screen: 'play', level: fromHash } : location.hash === '#levels' ? { screen: 'levels' } : { screen: 'home' });
}

registerSW({ immediate: true });
void boot();
