import type { GenerationRequest } from '@cozy-room-sort/generator';
import { activeThemes } from '../content/themes/index.ts';

const thirdRoom = activeThemes.find(theme => theme.id === 'cuisine' || theme.id === 'salle-de-bain')!;

export const RECIPES: readonly (GenerationRequest & { name: string })[] = [
    { theme: "salon", difficulty: "easy", seed: 43004, index: 1, objectCount: 9, name: "Le salon en désordre" },
    { theme: "salon", difficulty: "easy", seed: 44000, index: 2, objectCount: 10, name: "Coussins partout" },
    { theme: "salon", difficulty: "easy", seed: 45000, index: 3, objectCount: 10, name: "La grande étagère" },
    { theme: "salon", difficulty: "medium", seed: 46224, index: 4, objectCount: 16, name: "Le tas du canapé" },
    { theme: "salon", difficulty: "medium", seed: 47000, index: 5, objectCount: 17, name: "Après la fête" },
    { theme: "salon", difficulty: "medium", seed: 48000, index: 6, objectCount: 20, name: "Tout sur les rayons" },
    { theme: "salon", difficulty: "expert", seed: 49001, index: 7, objectCount: 53, name: "Le grand rangement du salon" },
    { theme: "chambre", difficulty: "easy", seed: 50000, index: 8, objectCount: 14, name: "La chambre sens dessus dessous" },
    { theme: "chambre", difficulty: "easy", seed: 51000, index: 9, objectCount: 14, name: "Les piles de coussins" },
    { theme: "chambre", difficulty: "easy", seed: 52000, index: 10, objectCount: 9, name: "Le tas de peluches" },
    { theme: "chambre", difficulty: "medium", seed: 53000, index: 11, objectCount: 24, name: "Bibliothèque de chambre" },
    { theme: "chambre", difficulty: "medium", seed: 54000, index: 12, objectCount: 24, name: "Un peu de tout" },
    { theme: "chambre", difficulty: "medium", seed: 55000, index: 13, objectCount: 18, name: "Les tours de jouets" },
    { theme: "chambre", difficulty: "expert", seed: 56001, index: 14, objectCount: 37, name: "Le grand rangement de la chambre" },
    { theme: thirdRoom.id, difficulty: "easy", seed: 57000, index: 15, objectCount: 12, name: thirdRoom.id === "cuisine" ? "Après le petit-déjeuner" : "La salle de bain après le bain" },
    { theme: thirdRoom.id, difficulty: "easy", seed: 58000, index: 16, objectCount: 9, name: thirdRoom.id === "cuisine" ? "Vaisselle en équilibre" : "La pile de serviettes" },
    { theme: thirdRoom.id, difficulty: "medium", seed: 59000, index: 17, objectCount: 22, name: thirdRoom.id === "cuisine" ? "Les bocaux du placard" : "Les placards ouverts" },
    { theme: thirdRoom.id, difficulty: "medium", seed: 60000, index: 18, objectCount: 22, name: thirdRoom.id === "cuisine" ? "Le plan de travail" : "Autour du lavabo" },
    { theme: thirdRoom.id, difficulty: "medium", seed: 61000, index: 19, objectCount: 27, name: thirdRoom.id === "cuisine" ? "Fruits et épices" : "Les étagères de soins" },
    { theme: thirdRoom.id, difficulty: "expert", seed: 62001, index: 20, objectCount: 48, name: thirdRoom.id === "cuisine" ? "Le grand rangement de la cuisine" : "Le grand rangement de la salle de bain" },
];
