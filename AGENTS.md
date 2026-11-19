# Travailler sur « Cozy Room Sort »

Guide pour tout agent de code (et tout humain) qui modifie ce dépôt. Les contraintes qui suivent font foi ;
la conception détaillée et les plans de travail sont tenus hors de ce dépôt. Outillage repris de six-de-chaque.

## Contraintes à respecter

- **Garde de marque** : aucun nom de jeu du commerce, aucune marque d'objet (consoles, outillage, jouets,
  logos de logiciels), aucun identifiant de ticket (majuscules, tiret, chiffres) dans les fichiers suivis par
  git, messages de commit compris (`tests/brand-guard.test.ts`). Les règles se nomment `R-001`…, les tests
  d'acceptation `T-001`… Le jeu est original : on ne copie ni graphismes ni niveaux d'un autre jeu.
- **Pas de règle métier dans le rendu.** `packages/schemas/src/**`, `packages/engine/src/**` et
  `packages/solver/src/**` n'utilisent ni `window`, `document`, `navigator`, `self`, `Date`, `localStorage`,
  `indexedDB`, `fetch`, `performance`, `requestAnimationFrame`, ni `Math.random`, et n'importent ni
  `phaser` ni `node:fs` (oxlint, vérifié par `tests/engine-purity.test.ts`). Le solveur reçoit son horloge
  en paramètre.
- **Moteur** : `applyAction(level, state, action)` ne modifie jamais ses arguments ; un coup refusé rend
  **le même objet** état et un seul événement `ACTION_REJECTED`. Mêmes niveau, version de règles, état
  initial et actions ⇒ même résultat.
- **Tout changement du moteur a ses tests.** Les invariants (un objet en un seul endroit, aucun
  dépassement de capacité, refus sans mutation, victoire conforme, trace du solveur rejouable) sont
  vérifiés par tests de propriétés.
- **Niveaux** : un niveau n'est publié que s'il passe `npm run level:validate` (structure valide **et**
  résolu par le solveur ; « non vérifié » est un échec, jamais « insoluble »).
- **Aucun LLM pendant la partie.** Aucune dépendance d'exécution sans accord. Aucun son sans accord.
- **Assets** : art découpé dans les planches de David Sevin. Aucun dessin par code, y compris pour
  les icônes. Les atlas et leurs tables de découpe sont dans `content/assets/planches/`. Provenance et licence
  de chaque cadre et des fichiers dérivés dans `content/assets/provenance.json`. Contrôle humain obligatoire.
  Code MIT, art original CC BY 4.0.
- **Changements visuels** vérifiés par captures Playwright (à partir de l'application web).

## Paquets

- `packages/schemas` : types du niveau, validateur sans dépendance, `level.schema.json`.
- `packages/engine` : état, actions, règles (accessibilité, cartons, tampon, statut), réducteur, modes,
  sauvegarde par rejeu.
- `packages/solver` : recherche en largeur bornée, empreinte d'état, indice, rejeu de trace.
- `tools/` : `validate-levels.ts`, `solve-level.ts`. `content/levels/` : niveaux JSON.

## Tests : ciblés, jamais la suite complète

En local, on ne lance que les fichiers touchés : `npx vitest run <fichier>`. La CI Woodpecker joue tout.

## Commits

Ajout par chemins nommés, jamais `git add -A`. Messages en français, sans identifiant de ticket.
