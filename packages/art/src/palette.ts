// Palette commune des objets : chaude, moyennement saturée, la même dans toutes les pièces.
export const INK = '#3B2A22';
export const COLORS = {
    terracotta: '#C8664B',
    moutarde: '#E0A93B',
    sauge: '#8DAA7B',
    canard: '#4F8F8C',
    lavande: '#8E86C1',
    rose: '#D98C9C',
    creme: '#F4E6CC',
    bois: '#A7754B',
    ciel: '#7FA7C9',
    prune: '#8A5A78'
} as const;
export type ColorName = keyof typeof COLORS;

/** Éclaircit ou assombrit une couleur #RRGGBB (k > 0 éclaircit). */
export function shade(hex: string, k: number): string {
    const n = Number.parseInt(hex.slice(1), 16);
    const channel = (v: number): string => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)).toString(16).padStart(2, '0');
    return `#${channel((n >> 16) & 255)}${channel((n >> 8) & 255)}${channel(n & 255)}`;
}
