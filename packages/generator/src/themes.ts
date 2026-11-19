import { activeThemes, type Theme } from '../../../content/themes/index.ts';

const aliases = new Map([['living-room', 'salon'], ['bedroom', 'chambre'], ['bathroom', 'salle-de-bain'], ['kitchen', 'cuisine']]);

export function findTheme(id: string): Theme {
    const canonical = aliases.get(id) ?? id;
    const theme = activeThemes.find(candidate => candidate.id === canonical);
    if (!theme) throw new Error(`univers absent : ${id}`);
    return theme;
}
