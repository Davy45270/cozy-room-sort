# Contribuer à Cozy Room Sort

Utiliser Node.js 26 et installer les versions verrouillées avec `npm ci`. Lancer le jeu avec `npm run dev`.

## Commandes

| Commande | Usage |
| --- | --- |
| `npm run lint` | Vérifier les sources et la pureté du moteur et de ses outils de calcul. |
| `npm run typecheck` | Compiler le projet en mode strict. |
| `npm run level:validate -- content/levels` | Vérifier le catalogue, sa structure et ses solutions. |
| `npm run level:solve -- <fichier> [--write]` | Trouver une solution et éventuellement l’inscrire dans les métadonnées. |
| `npm run level:generate -- --theme salon --difficulty medium --count 2 --seed 42001 --out /tmp/cozy-niveaux` | Produire un lot déterministe, validé et résolu. |
| `npm run level:generate -- --catalog` | Régénérer les vingt fichiers livrés depuis les recettes. |
| `npm run level:render -- <fichier> [--out x.png]` | Produire une capture avec Chromium. |
| `npm run --silent level:benchmark` | Écrire les résultats JSON sur stdout et afficher le tableau sur stderr. |
| `npm run build` et `npm run check:precache` | Construire la PWA et contrôler son précache. |

La génération d’un lot utilise `generated-levels/` par défaut et refuse d’écraser un fichier existant.
Les thèmes acceptent aussi les alias `living-room`, `bedroom` et `bathroom`.

## Tests ciblés

Les tests sont rangés dans `tests/unit/<paquet>/`, `tests/property/`, `tests/integration/` et `tests/e2e/`.
Lancer les fichiers touchés en local, par exemple `npx vitest run tests/integration/tools.test.ts`.
La CI exécute la suite complète et les parcours navigateur, y compris la capture du niveau.

## Illustrations et commits

Les illustrations proviennent des planches découpées de David Sevin. Les index et atlas se trouvent dans
`content/assets/planches/`. Associer chaque cadre et fichier dérivé à son origine, son empreinte et sa licence
dans `content/assets/provenance.json`, puis obtenir un contrôle humain. Les icônes et les images du jeu utilisent
les cadres d’atlas, sans dessin par code. Le code est sous licence MIT et l’art original sous CC BY 4.0.

Ajouter les fichiers par chemins nommés et écrire des commits thématiques en français. La garde de marque couvre
le texte suivi par Git. Exclure les noms commerciaux et les identifiants de ticket des fichiers et des messages
de commit. Conserver l’originalité des graphismes et des niveaux.
