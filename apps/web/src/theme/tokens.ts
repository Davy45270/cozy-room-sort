// Crème de la flèche, bois du parquet, terracotta du canapé et sauge du bouton de la première planche.
// Les valeurs sombres et les encres sont ajustées pour conserver la lisibilité.
export type Tone = 'light' | 'dark';
export type ThemePreference = 'auto' | Tone;

export const TOKEN_NAMES = [
    'bg', 'surface', 'surface-2', 'text', 'text-muted', 'ink', 'outline', 'accent', 'on-accent',
    'success', 'blocked', 'buffer', 'buffer-line', 'wall', 'floor', 'sticker', 'sage', 'progress-track',
    'room-salon', 'room-chambre', 'room-salle-de-bain'
] as const;
export type TokenName = typeof TOKEN_NAMES[number];

export const TOKENS: Readonly<Record<Tone, Readonly<Record<TokenName, string>>>> = {
    light: {
        'bg': '#FBF1DC', 'surface': '#FFF4DD', 'surface-2': '#FAE8C9', 'text': '#3B2A22', 'text-muted': '#6B5446',
        'ink': '#3B2A22', 'outline': '#8C6A52', 'accent': '#934B32', 'on-accent': '#FFF4DD',
        'success': '#3F7A4A', 'blocked': '#9A3B2E', 'buffer': '#F1E3CB', 'buffer-line': '#8C6A52',
        'wall': '#FBE5C4', 'floor': '#E4A56A', 'sticker': '#FFF4DD', 'sage': '#A4B585', 'progress-track': '#B49D74',
        'room-salon': '#934B32', 'room-chambre': '#69584E', 'room-salle-de-bain': '#466542'
    },
    dark: {
        'bg': '#2A211D', 'surface': '#382C26', 'surface-2': '#45372F', 'text': '#F4E6CC', 'text-muted': '#CDB89C',
        'ink': '#3B2A22', 'outline': '#B79A7E', 'accent': '#E59A7C', 'on-accent': '#2A211D',
        'success': '#8FC69A', 'blocked': '#EE9A8A', 'buffer': '#33281F', 'buffer-line': '#B79A7E',
        'wall': '#3A2E28', 'floor': '#51402F', 'sticker': '#E9D8BC', 'sage': '#A2BC79', 'progress-track': '#6C563C',
        'room-salon': '#E59A7C', 'room-chambre': '#DEC4A3', 'room-salle-de-bain': '#9DCB8E'
    }
};

/** Paires mesurées par le test de contraste : [avant-plan, fond, ratio minimal]. */
export const CONTRAST_PAIRS: readonly (readonly [TokenName, TokenName, number])[] = [
    ['text', 'bg', 4.5], ['text', 'surface', 4.5], ['text', 'surface-2', 4.5], ['text-muted', 'bg', 4.5], ['text-muted', 'surface', 4.5],
    ['on-accent', 'accent', 4.5], ['success', 'surface', 4.5], ['blocked', 'surface', 4.5],
    ['room-salon', 'surface', 4.5], ['room-chambre', 'surface', 4.5], ['room-salle-de-bain', 'surface', 4.5],
    ['outline', 'bg', 3], ['buffer-line', 'buffer', 3], ['ink', 'sticker', 3], ['outline', 'surface', 3]
];

function luminance(hex: string): number {
    const n = Number.parseInt(hex.slice(1), 16);
    const lin = (v: number): number => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

export function contrast(a: string, b: string): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
    return (hi + 0.05) / (lo + 0.05);
}

export function cssVariables(tone: Tone): string {
    return TOKEN_NAMES.map(name => `--crs-${name}: ${TOKENS[tone][name]};`).join(' ');
}
