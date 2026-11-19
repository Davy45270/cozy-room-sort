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
    /** Vignette non sélectionnée, quand la planche ne dessine que l’état sélectionné (chemin sous planches/). */
    readonly selecteur_normal?: string;
    /** Hauteur du fondu de bas de vue, en fraction de la vue (vue coupée par une base plate). */
    readonly vue_fondu_bas?: number;
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
