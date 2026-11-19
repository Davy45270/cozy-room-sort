import type { AppContext, Screen } from '../app-context.ts';
import { isUnlocked, levelById, LEVELS, ROOM_ORDER, THEMES, themeOf } from '../content.ts';
import { atlasImage, h, iconButton, roomChoiceImage } from '../dom.ts';

export async function homeScreen(ctx: AppContext): Promise<Screen> {
    const progress = await ctx.store.progress();
    const last = ctx.settings.lastLevelId === null ? undefined : levelById(ctx.settings.lastLevelId);
    const firstOpen = LEVELS.find(level => progress[level.id] === undefined && isUnlocked(level, progress)) ?? LEVELS[0];
    const target = last && progress[last.id] === undefined ? last : firstOpen;
    const featured = last ? themeOf(last) : THEMES['salon']!;
    const element = h('main', { class: 'screen home', 'data-testid': 'ecran-accueil' },
        h('h1', { class: 'home-title', text: 'Cozy Room Sort' }),
        atlasImage(featured.vue, featured.label, 'home-view'),
        h('div', { class: 'home-menu' },
            h('div', { class: 'home-rooms' }, ...ROOM_ORDER.map(room => {
                const theme = THEMES[room]!;
                return h('button', { type: 'button', class: 'room-choice', 'aria-label': theme.label,
                    onclick: () => ctx.go({ screen: 'levels', room }) }, roomChoiceImage(theme, false));
            })),
            iconButton('btn-jouer', last && target === last ? 'Continuer' : 'Jouer',
                () => { if (target) ctx.go({ screen: 'play', level: target }); },
                { class: 'icon-button play-button', 'data-testid': 'jouer' }),
            h('div', { class: 'home-actions' },
                h('button', { type: 'button', class: 'button', onclick: () => ctx.go({ screen: 'levels' }), text: 'Choisir un niveau' }),
                iconButton('btn-reglages', 'Réglages', () => ctx.go({ screen: 'settings', back: { screen: 'home' } })))));
    return { element };
}
