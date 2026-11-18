import type { AppContext, Screen } from '../app-context.ts';
import { isUnlocked, levelNumber, LEVELS, ROOM_ORDER, THEMES } from '../content.ts';
import { h, icon, iconButton, stars } from '../dom.ts';

export async function levelsScreen(ctx: AppContext): Promise<Screen> {
    const progress = await ctx.store.progress();
    const element = h('main', { class: 'screen levels' },
        h('header', { class: 'screen-header' },
            iconButton('back', 'Accueil', () => ctx.go({ screen: 'home' })),
            h('h1', { text: 'Niveaux' }),
            iconButton('settings', 'Réglages', () => ctx.go({ screen: 'settings', back: { screen: 'levels' } }))),
        ...ROOM_ORDER.map(room => h('section', { class: `room-group room-${room}`, 'aria-labelledby': `room-${room}` },
            h('h2', { id: `room-${room}`, text: THEMES[room]?.label ?? room }),
            h('ul', { class: 'level-grid' }, ...LEVELS.filter(l => l.theme === room).map(level => {
                const open = isUnlocked(level, progress);
                const result = progress[level.id];
                const n = levelNumber(level);
                return h('li', {}, h('button', {
                    type: 'button', class: `level-card${result ? ' done' : ''}`, disabled: !open, 'data-level': level.id,
                    'aria-label': `Niveau ${n}, ${level.name}${open ? '' : ', verrouillé'}${result ? `, ${result.stars} étoile${result.stars > 1 ? 's' : ''}` : ''}`,
                    onclick: () => ctx.go({ screen: 'play', level })
                }, h('span', { class: 'level-number', text: String(n) }), h('span', { class: 'level-name', text: level.name }),
                open ? stars(result?.stars ?? 0) : icon('lock')));
            })))));
    return { element };
}
