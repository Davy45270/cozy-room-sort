import { cssVariables, TOKENS, type ThemePreference, type Tone } from './tokens.ts';

/** Feuille des tokens : clair par défaut, sombre selon le système, et les deux forçables par data-theme. */
export function themeStylesheet(): string {
    return `:root, :root[data-theme="light"] { ${cssVariables('light')} color-scheme: light; }\n`
        + `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${cssVariables('dark')} color-scheme: dark; } }\n`
        + `:root[data-theme="dark"] { ${cssVariables('dark')} color-scheme: dark; }\n`;
}

export function resolveTone(preference: ThemePreference, systemDark: boolean): Tone {
    return preference === 'auto' ? (systemDark ? 'dark' : 'light') : preference;
}

/** Pose data-theme sur la racine (toujours résolu, pour que la scène et les tests lisent un seul attribut). */
export function applyTheme(preference: ThemePreference, root: HTMLElement = document.documentElement): Tone {
    const systemDark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
    const tone = resolveTone(preference, systemDark);
    root.dataset['theme'] = tone;
    root.dataset['themePreference'] = preference;
    const meta = root.ownerDocument.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', getComputedStyle(root).getPropertyValue('--crs-bg').trim() || TOKENS[tone].bg);
    return tone;
}
