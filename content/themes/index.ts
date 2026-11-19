import salon from './salon.json' with { type: 'json' };
import chambre from './chambre.json' with { type: 'json' };
import salleDeBain from './salle-de-bain.json' with { type: 'json' };
import cuisine from './cuisine.json' with { type: 'json' };

export interface Theme {
    readonly id: string;
    readonly label: string;
    readonly vue: string;
    readonly sol: string;
    readonly selecteur: string;
    readonly actif?: boolean;
    readonly remplace?: string;
    readonly categories: readonly {
        readonly id: string;
        readonly label: string;
        readonly icone: string;
        readonly objets: readonly string[];
        readonly expertSeulement?: boolean;
    }[];
}

const themes: readonly Theme[] = [salon, chambre, salleDeBain, cuisine];
const enabled = themes.filter(theme => theme.actif !== false);
const replaced = new Set(enabled.flatMap(theme => theme.remplace ? [theme.remplace] : []));
export const activeThemes = enabled.filter(theme => !replaced.has(theme.id));
