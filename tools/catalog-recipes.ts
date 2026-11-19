import type { GenerationRequest } from '@cozy-room-sort/generator';

export const RECIPES: readonly (GenerationRequest & { name: string })[] = [
    { theme: "salon", difficulty: "easy", seed: 43004, index: 1, name: "Le salon en désordre" },
    { theme: "salon", difficulty: "easy", seed: 44000, index: 2, name: "Coussins partout" },
    { theme: "salon", difficulty: "easy", seed: 45000, index: 3, name: "La grande étagère" },
    { theme: "salon", difficulty: "medium", seed: 46224, index: 4, name: "Le tas du canapé" },
    { theme: "salon", difficulty: "medium", seed: 47000, index: 5, name: "Après la fête" },
    { theme: "salon", difficulty: "medium", seed: 48000, index: 6, name: "Tout sur les rayons" },
    { theme: "salon", difficulty: "medium", seed: 49000, index: 7, name: "Le grand rangement du salon" },
    { theme: "chambre", difficulty: "easy", seed: 50000, index: 8, name: "La chambre sens dessus dessous" },
    { theme: "chambre", difficulty: "easy", seed: 51000, index: 9, name: "Les piles de coussins" },
    { theme: "chambre", difficulty: "easy", seed: 52000, index: 10, name: "Le tas de peluches" },
    { theme: "chambre", difficulty: "medium", seed: 53000, index: 11, name: "Bibliothèque de chambre" },
    { theme: "chambre", difficulty: "medium", seed: 54000, index: 12, name: "Un peu de tout" },
    { theme: "chambre", difficulty: "medium", seed: 55000, index: 13, name: "Les tours de jouets" },
    { theme: "chambre", difficulty: "medium", seed: 56000, index: 14, name: "Le grand rangement de la chambre" },
    { theme: "salle-de-bain", difficulty: "easy", seed: 57000, index: 15, name: "La salle de bain après le bain" },
    { theme: "salle-de-bain", difficulty: "easy", seed: 58000, index: 16, name: "La pile de serviettes" },
    { theme: "salle-de-bain", difficulty: "medium", seed: 59000, index: 17, name: "Les placards ouverts" },
    { theme: "salle-de-bain", difficulty: "medium", seed: 60000, index: 18, name: "Autour du lavabo" },
    { theme: "salle-de-bain", difficulty: "medium", seed: 61000, index: 19, name: "Les étagères de soins" },
    { theme: "salle-de-bain", difficulty: "medium", seed: 62000, index: 20, name: "Le grand rangement de la salle de bain" },
];
