import type { Level } from '@cozy-room-sort/schemas';

import { activeThemes, type Theme } from '../../../content/themes/index.ts';

const levelModules = import.meta.glob<Level>('../../../content/levels/*.json', { eager: true, import: 'default' });
export const THEMES: Readonly<Record<string, Theme>> = Object.fromEntries(activeThemes.map(theme => [theme.id, theme]));
export const LEVELS: readonly Level[] = Object.keys(levelModules).sort().map(k => levelModules[k]!)
    .filter(level => Object.hasOwn(THEMES, level.theme));
export const ROOM_ORDER = [...new Set([...LEVELS.map(level => level.theme), ...Object.keys(THEMES)])];

export function levelById(id: string): Level | undefined { return LEVELS.find(l => l.id === id); }
export function levelNumber(level: Level): number { return LEVELS.indexOf(level) + 1; }
export function nextLevel(level: Level): Level | undefined { return LEVELS[LEVELS.indexOf(level) + 1]; }

export function themeOf(level: Level): Theme {
    const theme = THEMES[level.theme];
    if (!theme) throw new Error(`Pièce inconnue : ${level.theme}`);
    return theme;
}

export function pictoOf(level: Level, category: string): string {
    const icon = themeOf(level).categories.find(c => c.id === category)?.icone;
    if (!icon) throw new Error(`Catégorie inconnue : ${level.theme}/${category}`);
    return icon;
}

export function labelOf(level: Level, category: string): string {
    return level.categories.find(c => c.id === category)?.label ?? category;
}

export function objectName(asset: string): string {
    const words = asset.replaceAll('-', ' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
}

export function isUnlocked(level: Level, progress: Readonly<Record<string, unknown>>): boolean {
    const i = LEVELS.indexOf(level);
    return i <= 0 || progress[LEVELS[i - 1]!.id] !== undefined;
}
