# Cozy Room Sort

Range les objets d’une pièce dans les cartons de leur catégorie. Quand aucun carton ouvert ne convient, l’objet
attend dans le tampon. Le salon, la chambre et la salle de bain proposent vingt niveaux. Le jeu fonctionne hors
ligne après la première mise en cache.

## Installation et jeu

Avec Node.js 26, lance ces commandes puis ouvre l’adresse locale indiquée dans le terminal.

```sh
npm ci
npm run dev
```

Choisis une pièce puis un niveau. Touche ou clique sur les objets à portée. Au clavier, utilise la touche Tab
pour atteindre la liste des objets et Entrée pour en sélectionner un. Les réglages proposent les modes détente,
classique et expert. Les sauvegardes et les scores restent sur l’appareil.

Le [guide de contribution](CONTRIBUTING.md) couvre les tests, la génération de niveaux et les illustrations.
La [documentation d’architecture](docs/architecture/README.md) décrit les modules et le flux d’un coup.

## Parcours de test

- `/#niveaux` ouvre le catalogue, `/#jeu/001-salon` le premier niveau et `/#reglages` les réglages.
- `/?test=1&demo=gagner` rejoue la solution du premier niveau, ou celle du niveau indiqué par la route de jeu.
- `/?test=1&demo=bloquer` ouvre `004-salon` en classique et rejoue une trace qui remplit le tampon et mène à une impasse.
- Les démonstrations jouent un coup toutes les 150 ms et laissent la progression et les sauvegardes intactes.

Code sous [licence MIT](LICENSE). Illustrations de David Sevin sous [licence CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.fr).
