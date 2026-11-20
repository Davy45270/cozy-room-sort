import { registerSW } from 'virtual:pwa-register';
import { levelById, LEVELS } from './content.ts';
import { BLOCKED_LEVEL, demonstration } from './test-hooks.ts';
import type { AppContext, Route, Screen } from './app-context.ts';
import { homeScreen } from './screens/home.ts';
import { levelsScreen } from './screens/levels.ts';
import { playScreen } from './screens/play.ts';
import { settingsScreen } from './screens/settings.ts';
import { DEFAULT_SETTINGS, openStore, type Settings } from './storage/db.ts';
import { applyTheme, themeStylesheet } from './theme/apply.ts';
import './styles.css';

async function boot(): Promise<void> {
    const style = document.createElement('style');
    style.textContent = themeStylesheet();
    document.head.prepend(style);
    const store = await openStore();
    let settings: Settings = await store.settings().catch(() => DEFAULT_SETTINGS);
    const setTone = (): void => { applyTheme(settings.theme); };
    setTone();
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', setTone);

    const root = document.getElementById('app') as HTMLElement;
    let current: Screen | undefined;
    let generation = 0;
    const ctx: AppContext = {
        store,
        get settings() { return settings; },
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
        if (route.screen === 'levels') return levelsScreen(ctx, route.room);
        if (route.screen === 'settings') return settingsScreen(ctx, route.back);
        return playScreen(ctx, route.level, route.notice);
    };
    const show = async (route: Route): Promise<void> => {
        const mine = ++generation;
        const screen = await build(route);
        if (mine !== generation) { screen.dispose?.(); return; }
        current?.dispose?.();
        current = screen;
        root.replaceChildren(screen.element);
        screen.mounted?.();
        const heading = screen.element.querySelector<HTMLElement>('h1');
        if (heading && !heading.closest('[inert]')) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
        const hash = route.screen === 'play' ? `#jeu/${route.level.id}`
            : route.screen === 'levels' ? '#niveaux' : route.screen === 'settings' ? '#reglages' : '';
        history.replaceState(null, '', location.pathname + location.search + hash);
    };
    const routeFromHash = (): Route => {
        const hash = location.hash;
        if (hash === '#niveaux' || hash === '#levels') return { screen: 'levels' };
        if (hash === '#reglages') return { screen: 'settings', back: { screen: 'home' } };
        const fromHash = levelById(hash.startsWith('#jeu/') ? hash.slice(5) : hash.slice(1));
        return fromHash ? { screen: 'play', level: fromHash } : { screen: 'home' };
    };
    window.addEventListener('hashchange', () => { void show(routeFromHash()); });
    let initial = routeFromHash();
    const demo = demonstration();
    const demoLevel = demo === 'bloquer' ? levelById(BLOCKED_LEVEL)
        : demo === 'gagner' && initial.screen === 'home' ? LEVELS[0] : undefined;
    if (demoLevel) initial = { screen: 'play', level: demoLevel };
    await show(initial);
}

registerSW({ immediate: true });
void boot();
