import type { Level } from '@cozy-room-sort/schemas';

export interface ThemeCategory { id: string; label: string; icone: string; objets: readonly string[] }
export interface Theme {
    id: string; label: string; vue: string; sol: string; selecteur: string;
    categories: readonly ThemeCategory[];
}

const levelModules = import.meta.glob<Level>('../../../content/levels/*.json', { eager: true, import: 'default' });
const themeModules = import.meta.glob<Theme>('../../../content/themes/*.json', { eager: true, import: 'default' });

export const LEVELS: readonly Level[] = Object.keys(levelModules).sort().map(k => levelModules[k]!);
export const THEMES: Readonly<Record<string, Theme>> = Object.fromEntries(Object.values(themeModules).map(t => [t.id, t]));
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
