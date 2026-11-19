import salon from '../../../content/themes/salon.json' with { type: 'json' };
import chambre from '../../../content/themes/chambre.json' with { type: 'json' };
import salleDeBain from '../../../content/themes/salle-de-bain.json' with { type: 'json' };

interface Theme {
    readonly id: string;
    readonly label: string;
    readonly vue: string;
    readonly categories: readonly {
        readonly id: string;
        readonly label: string;
        readonly icone: string;
        readonly objets: readonly string[];
    }[];
}

const themes: readonly Theme[] = [salon, chambre, salleDeBain];
const aliases = new Map([['living-room', 'salon'], ['bedroom', 'chambre'], ['bathroom', 'salle-de-bain']]);

export function findTheme(id: string): Theme {
    const canonical = aliases.get(id) ?? id;
    const theme = themes.find(candidate => candidate.id === canonical);
    if (!theme) throw new Error(`univers absent : ${id}`);
    return theme;
}
