import { objectSvg } from '@cozy-room-sort/art';
import type { AppContext, Screen } from '../app-context.ts';
import { isUnlocked, levelById, LEVELS } from '../content.ts';
import { h, svgImage } from '../dom.ts';
import type { Level } from '@cozy-room-sort/schemas';

const DECOR = ['coussin-moutarde', 'livre-canard', 'plante-fougere', 'ours-bois', 'tasse-terracotta', 'vase-rose'];

export async function homeScreen(ctx: AppContext): Promise<Screen> {
    const progress = await ctx.store.progress();
    const last = ctx.settings.lastLevelId === null ? undefined : levelById(ctx.settings.lastLevelId);
    const firstOpen = LEVELS.find(l => progress[l.id] === undefined && isUnlocked(l, progress)) ?? LEVELS[0];
    const target: Level | undefined = last && progress[last.id] === undefined ? last : firstOpen;
    const started = Object.keys(progress).length > 0 || last !== undefined;
    const sticker = ctx.tone() === 'dark' ? getComputedStyle(document.documentElement).getPropertyValue('--crs-sticker').trim() : undefined;
    const element = h('main', { class: 'screen home' },
        h('div', { class: 'home-decor', 'aria-hidden': 'true' }, ...DECOR.map(a => svgImage(objectSvg(a, 96, sticker), ''))),
        h('h1', { class: 'home-title', text: 'Cozy Room Sort' }),
        h('p', { class: 'home-tagline', text: 'Range la pièce, un objet à la fois, dans le bon carton.' }),
        h('div', { class: 'home-actions' },
            h('button', { type: 'button', class: 'button primary', onclick: () => { if (target) ctx.go({ screen: 'play', level: target }); }, text: started ? 'Continuer' : 'Jouer' }),
            h('button', { type: 'button', class: 'button', onclick: () => ctx.go({ screen: 'levels' }), text: 'Choisir un niveau' }),
            h('button', { type: 'button', class: 'button', onclick: () => ctx.go({ screen: 'settings', back: { screen: 'home' } }), text: 'Réglages' })),
        h('ol', { class: 'how-to' },
            h('li', { text: 'Touche un objet dégagé : il file dans le carton de sa catégorie.' }),
            h('li', { text: 'Si son carton n\'est pas encore ouvert, il attend dans le tampon.' }),
            h('li', { text: 'Tampon plein : plus de coup. Moins de passages au tampon, plus d\'étoiles.' })));
    return { element };
}
