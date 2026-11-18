// Contenu livré : niveaux et thèmes, lus au build (aucun chargement réseau).
import type { Level } from '@cozy-room-sort/schemas';

export interface ThemeCategory { id: string; label: string; picto: string }
export interface Theme { id: string; label: string; categories: readonly ThemeCategory[] }

const levelModules = import.meta.glob<Level>('../../../content/levels/*.json', { eager: true, import: 'default' });
const themeModules = import.meta.glob<Theme>('../../../content/themes/*.json', { eager: true, import: 'default' });

export const LEVELS: readonly Level[] = Object.keys(levelModules).sort().map(k => levelModules[k] as Level);
export const THEMES: Readonly<Record<string, Theme>> = Object.fromEntries(Object.values(themeModules).map(t => [t.id, t]));
export const ROOM_ORDER = ['salon', 'chambre', 'cuisine'] as const;

export function levelById(id: string): Level | undefined { return LEVELS.find(l => l.id === id); }
export function levelNumber(level: Level): number { return LEVELS.indexOf(level) + 1; }
export function nextLevel(level: Level): Level | undefined { return LEVELS[LEVELS.indexOf(level) + 1]; }

export function pictoOf(level: Level, category: string): string {
    return THEMES[level.theme]?.categories.find(c => c.id === category)?.picto ?? 'book';
}
export function labelOf(level: Level, category: string): string {
    return level.categories.find(c => c.id === category)?.label ?? category;
}

/** Nom lisible d'un objet, pour la liste accessible : famille, puis catégorie. */
const FAMILY_NAMES: Readonly<Record<string, string>> = {
    livre: 'Livre', coussin: 'Coussin', plaid: 'Plaid', plante: 'Plante', cadre: 'Cadre', lampe: 'Lampe', ours: 'Ours en peluche',
    lapin: 'Lapin en peluche', chat: 'Chat en peluche', pull: 'Pull', tshirt: 'Tee-shirt', chaussette: 'Chaussette', bougie: 'Bougie',
    veilleuse: 'Veilleuse', assiette: 'Assiette', tasse: 'Tasse', bol: 'Bol', fouet: 'Fouet', louche: 'Louche', spatule: 'Spatule',
    bocal: 'Bocal', pot: 'Pot', boite: 'Boîte', vase: 'Bouquet', torchon: 'Torchon'
};
export function objectName(asset: string): string { return FAMILY_NAMES[asset.slice(0, asset.indexOf('-'))] ?? asset; }

/** Un niveau est ouvert si c'est le premier ou si le précédent a au moins une étoile. */
export function isUnlocked(level: Level, progress: Readonly<Record<string, unknown>>): boolean {
    const i = LEVELS.indexOf(level);
    return i <= 0 || progress[(LEVELS[i - 1] as Level).id] !== undefined;
}
