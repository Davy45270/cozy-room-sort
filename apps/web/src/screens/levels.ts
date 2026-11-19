import type { AppContext, Screen } from '../app-context.ts';
import { isUnlocked, levelNumber, LEVELS, ROOM_ORDER, THEMES } from '../content.ts';
import { atlasImage, h, iconButton, stars } from '../dom.ts';

export async function levelsScreen(ctx: AppContext, room?: string): Promise<Screen> {
    const progress = await ctx.store.progress();
    const recent = LEVELS.find(level => level.id === ctx.settings.lastLevelId)?.theme;
    const available = LEVELS.find(level => !progress[level.id] && isUnlocked(level, progress))?.theme;
    const defaultRoom = room ?? recent ?? available ?? ROOM_ORDER[0];
    const tabs = ROOM_ORDER.map(id => h('button', {
        type: 'button', class: 'room-choice', id: `onglet-${id}`, 'data-testid': `onglet-${id}`,
        'aria-label': THEMES[id]!.label, role: 'tab', 'aria-controls': `piece-${id}`
    }, atlasImage(THEMES[id]!.selecteur)));
    const panels = ROOM_ORDER.map(id => h('section', {
        id: `piece-${id}`, role: 'tabpanel', 'aria-labelledby': `onglet-${id}`
    }, h('ul', { class: 'level-grid' }, ...LEVELS.filter(level => level.theme === id).map(level => {
        const open = isUnlocked(level, progress);
        const result = progress[level.id];
        const number = levelNumber(level);
        return h('li', {}, h('button', {
            type: 'button', class: 'level-card', disabled: !open, 'data-testid': `niveau-${level.id}`,
            'aria-label': `Niveau ${number}, ${level.name}${open ? '' : ', verrouillé'}${result ? `, ${result.stars} étoile${result.stars > 1 ? 's' : ''}` : ''}`,
            onclick: () => ctx.go({ screen: 'play', level })
        }, h('span', { class: 'level-number', text: String(number) }), h('span', { class: 'level-name', text: level.name }),
        stars(result?.stars ?? 0)));
    }))));

    const activate = (selected: number, focus: boolean): void => {
        tabs.forEach((tab, index) => {
            const active = selected === index;
            tab.setAttribute('aria-selected', String(active));
            tab.tabIndex = active ? 0 : -1;
            panels[index]!.hidden = !active;
        });
        if (focus) tabs[selected]?.focus();
    };
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => activate(index, false));
        tab.addEventListener('keydown', event => {
            const destinations: Record<string, number> = {
                ArrowLeft: (index + tabs.length - 1) % tabs.length,
                ArrowRight: (index + 1) % tabs.length,
                Home: 0, End: tabs.length - 1
            };
            const selected = destinations[event.key];
            if (selected === undefined) return;
            event.preventDefault();
            activate(selected, true);
        });
    });
    activate(Math.max(0, ROOM_ORDER.findIndex(id => id === defaultRoom)), false);

    return { element: h('main', { class: 'screen levels', 'data-testid': 'ecran-niveaux' },
        h('header', { class: 'screen-header' },
            iconButton('btn-accueil', 'Accueil', () => ctx.go({ screen: 'home' })),
            h('h1', { text: 'Niveaux' }),
            iconButton('btn-reglages', 'Réglages', () => ctx.go({ screen: 'settings', back: { screen: 'levels' } }))),
        h('div', { class: 'room-tabs', role: 'tablist', 'aria-label': 'Pièces' }, ...tabs), ...panels) };
}
