import type { Mode } from '@cozy-room-sort/engine';
import type { AppContext, Route, Screen } from '../app-context.ts';
import { h, iconButton } from '../dom.ts';
import type { ThemePreference } from '../theme/tokens.ts';

const MODES: readonly [Mode, string, string][] = [
    ['detente', 'Détente', 'Une place de plus au tampon, annulations à volonté.'],
    ['classique', 'Classique', 'Trois annulations et trois indices par niveau.'],
    ['expert', 'Expert', 'Ni annulation ni indice.']
];
const THEME_CHOICES: readonly [ThemePreference, string][] = [['auto', 'Système'], ['light', 'Clair'], ['dark', 'Sombre']];

function radioGroup<T extends string>(name: string, legend: string, choices: readonly (readonly [T, string, string?])[], current: T, onChange: (v: T) => void): HTMLElement {
    return h('fieldset', { class: 'choice-group' }, h('legend', { text: legend }), ...choices.map(([value, label, help]) =>
        h('label', { class: 'choice' },
            h('input', { type: 'radio', name, value, checked: value === current, onchange: () => onChange(value) }),
            h('span', { class: 'choice-text' }, h('span', { class: 'choice-label', text: label }), help ? h('span', { class: 'choice-help', text: help }) : null))));
}

export function settingsScreen(ctx: AppContext, back: Route): Screen {
    const element = h('main', { class: 'screen settings', 'data-testid': 'ecran-reglages' },
        h('header', { class: 'screen-header' }, iconButton(back.screen === 'home' ? 'btn-accueil' : 'btn-annuler', 'Retour', () => ctx.go(back)), h('h1', { text: 'Réglages' }), h('span', { class: 'spacer' })),
        radioGroup('mode', 'Mode de jeu', MODES, ctx.settings.mode, mode => {
            // Une partie en cours ne se rejoue pas sous d'autres règles : changer de mode l'abandonne.
            void ctx.updateSettings({ mode });
        }),
        h('p', { class: 'note', text: 'Changer de mode recommence les parties en cours.' }),
        radioGroup('theme', 'Apparence', THEME_CHOICES, ctx.settings.theme, theme => { void ctx.updateSettings({ theme }); }),
        h('fieldset', { class: 'choice-group' }, h('legend', { text: 'Audio' }),
            h('label', { class: 'choice' },
                h('input', { type: 'checkbox', name: 'sons', checked: ctx.settings.sons,
                    onchange: event => { void ctx.updateSettings({ sons: (event.currentTarget as HTMLInputElement).checked }); } }),
                h('span', { class: 'choice-label', text: 'Sons' }))));
    return { element };
}
