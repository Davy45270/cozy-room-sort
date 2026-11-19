# Cozy Room Sort

Range les objets d’une pièce dans les cartons de leur catégorie. Quand aucun carton ouvert ne convient, l’objet
attend dans le tampon. Le salon, la chambre et la salle de bain proposent vingt niveaux. Le jeu fonctionne hors
ligne après la première mise en cache.

```sh
npm ci
npm run dev
npx vitest run tests/assets-niveaux.test.ts
npm run level:validate -- content/levels
npm run build
npm run check:precache
```

## Niveaux et illustrations

`content/themes/` décrit les pièces, leurs catégories et leurs cadres. `node tools/author-levels.ts` régénère les
vingt niveaux à partir de ces thèmes et de recettes déterministes. Le validateur vérifie la structure et résout
chaque niveau. Les anciennes parties en cours dont les objets ont changé repartent du début.

Les illustrations et les icônes d’installation proviennent des planches de David Sevin. Les tables de découpe et
les atlas WebP avec index JSON se trouvent dans `content/assets/planches/`. La provenance, les empreintes et les
boîtes utiles de chaque cadre sont dans [le registre des illustrations](content/assets/provenance.json). Les
atlas de meubles et les variantes graphiques de la salle de bain restent dans la bibliothèque. Le contrôle des
captures du jeu est réalisé par la CI.

## Parcours de test

- `/#niveaux` ouvre les trois onglets de pièces, `/#jeu/001-salon` le premier niveau, et `/#reglages` les réglages.
- `/?test=1&demo=gagner` rejoue la solution du premier niveau, ou celle du niveau indiqué par la route de jeu.
- `/?test=1&demo=bloquer` ouvre le niveau `004-salon` en classique et sélectionne, dans l’ordre, `objet-1`,
  `objet-2`, `objet-3`, `objet-4`, `objet-6`. Le moteur constate alors le blocage.
- Les démonstrations jouent un coup toutes les 150 ms et laissent la progression et les sauvegardes intactes.

Code sous [licence MIT](LICENSE). Illustrations de David Sevin sous [licence CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.fr).
