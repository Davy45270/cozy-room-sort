# Proposer un niveau avec un agent

Un agent peut proposer un fichier JSON du contrat courant ou partir de la sortie du générateur. Choisir un thème
dans `content/themes/` et employer ses identifiants de catégorie et d’objets. Les règles du moteur, le schéma et
le solveur décident si le niveau est valide et jouable. Le jeu tourne localement sans modèle de langage.

```sh
npm run level:generate -- --theme salon --difficulty medium --count 1 --seed 42001 --out /tmp/cozy-niveaux
npm run level:validate -- /tmp/cozy-niveaux
npm run level:solve -- /tmp/cozy-niveaux/001-salon.json --write
npm run level:render -- /tmp/cozy-niveaux/001-salon.json --out /tmp/cozy-niveau.png
npx vitest run tests/integration/levels.test.ts
```

La capture utilise les atlas locaux et montre la vue, les objets, les silhouettes, les cartons et le tampon.
Elle demande Chromium. Employer la capture pour le contrôle visuel, puis faire vérifier les nouveaux cadres
par une personne. Un niveau avec un verdict `unverified` attend une vérification réussie avant publication.

En local, lancer Vitest uniquement sur les fichiers touchés. La CI exécute la suite et les captures de bout en bout.
Voir [le guide de contribution](../../CONTRIBUTING.md) pour les commandes et les règles de provenance.
