# Cozy Room Sort

Ranger une pièce en désordre : on touche les objets accessibles et on les trie dans les cartons. Quand aucun
carton ne convient, l'objet attend dans un petit tampon. Jeu hors ligne, pour toute la famille.

Cette première étape contient le moteur de règles, le validateur de niveaux et le solveur ; l'application
viendra ensuite.

```sh
npm ci
npx vitest run packages/engine/test        # tests ciblés
npm run level:validate -- content/levels   # structure + résolution de chaque niveau
npm run level:solve -- content/levels/001-salon.json --write
```

Code sous licence MIT (`LICENSE`).
