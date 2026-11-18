// Palette du jeu en tokens (--crs-*), un jeu de valeurs par mode. Une seule palette ; chaque pièce n'ajoute qu'un accent.
export type Tone = 'light' | 'dark';
export type ThemePreference = 'auto' | Tone;

export const TOKEN_NAMES = [
    'bg', 'surface', 'surface-2', 'text', 'text-muted', 'ink', 'outline', 'accent', 'on-accent',
    'success', 'blocked', 'buffer', 'buffer-line', 'wall', 'floor', 'sticker',
    'room-salon', 'room-chambre', 'room-cuisine'
] as const;
export type TokenName = typeof TOKEN_NAMES[number];

export const TOKENS: Readonly<Record<Tone, Readonly<Record<TokenName, string>>>> = {
    light: {
        'bg': '#F7EEDF', 'surface': '#FFF8EC', 'surface-2': '#EFE1C8', 'text': '#3B2A22', 'text-muted': '#6B5446',
        'ink': '#3B2A22', 'outline': '#8C6A52', 'accent': '#A8492F', 'on-accent': '#FFF8EC',
        'success': '#3F7A4A', 'blocked': '#9A3B2E', 'buffer': '#F1E3CB', 'buffer-line': '#8C6A52',
        'wall': '#F0DCC0', 'floor': '#D9B98F', 'sticker': '#FFF8EC',
        'room-salon': '#A8492F', 'room-chambre': '#5E57A0', 'room-cuisine': '#4D7343'
    },
    dark: {
        'bg': '#2A211D', 'surface': '#382C26', 'surface-2': '#45372F', 'text': '#F4E6CC', 'text-muted': '#CDB89C',
        'ink': '#3B2A22', 'outline': '#B79A7E', 'accent': '#E59A7C', 'on-accent': '#2A211D',
        'success': '#8FC69A', 'blocked': '#EE9A8A', 'buffer': '#33281F', 'buffer-line': '#B79A7E',
        'wall': '#3A2E28', 'floor': '#51402F', 'sticker': '#E9D8BC',
        'room-salon': '#E59A7C', 'room-chambre': '#B5AEEA', 'room-cuisine': '#9DCB8E'
    }
};

/** Paires mesurées par le test de contraste : [avant-plan, fond, ratio minimal]. */
export const CONTRAST_PAIRS: readonly (readonly [TokenName, TokenName, number])[] = [
    ['text', 'bg', 4.5], ['text', 'surface', 4.5], ['text', 'surface-2', 4.5], ['text-muted', 'bg', 4.5], ['text-muted', 'surface', 4.5],
    ['on-accent', 'accent', 4.5], ['success', 'surface', 4.5], ['blocked', 'surface', 4.5],
    ['room-salon', 'surface', 4.5], ['room-chambre', 'surface', 4.5], ['room-cuisine', 'surface', 4.5],
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
