# Règles de jeu et contrat de niveau

## Pièce, cartons et tampon

- Les positions sont normalisées de 0 à 1. `layer` donne un ordre de dessin. Le rendu place un recouvreur
  devant les objets qu’il bloque. Un objet devient accessible quand tous ses `blockedBy` ont quitté la pièce,
  y compris par le tampon. Un objet `hidden` a au moins un bloqueur et apparaît en silhouette jusqu’à sa libération.
- La sélection range l’objet dans le premier carton actif compatible, selon l’ordre des emplacements. Sinon,
  elle le place en fin de tampon si une place est libre. Un tampon plein fait refuser le coup incompatible
  sans mutation. Les autres coups légaux restent jouables.
- Le carton rempli se ferme. Le premier carton en attente reprend son emplacement. Le vidage automatique
  prend le premier objet compatible dans l’ordre d’arrivée du tampon et choisit le premier carton compatible.
  Après chaque rangement, il reprend le balayage au début pour tenir compte des cartons qui viennent de s’ouvrir.
- La victoire demande une pièce et un tampon vides ainsi que tous les quotas satisfaits. Sans coup légal restant,
  le statut est `blocked` dans un mode qui autorise l’annulation. Le joueur peut annuler selon son historique et
  son quota, ou recommencer. Le statut est `lost` dans un mode sans annulation, ou quand la partie atteint sa
  limite de temps si le niveau en fixe une.
- Le mode détente ajoute une place au tampon et autorise jusqu’à 200 annulations. Le mode classique autorise
  trois annulations et trois indices. Le mode expert désactive ces deux aides. Le mode de jeu et la difficulté
  inscrite dans le niveau sont réglés indépendamment.

## Difficulté et validation

Les seuils s’appliquent aux règles de base du JSON. Le pourcentage divise le nombre d’objets `hidden: true`
par le nombre total d’objets. Les bornes sont inclusives.

| Difficulté | Objets | Catégories | Places au tampon | Objets masqués |
| --- | ---: | ---: | ---: | ---: |
| Facile (`easy`) | 9–15 | 3 | 5 | 0–10 % |
| Moyen (`medium`) | 16–30 | 4–6 | 4 | 10–25 % |
| Expert (`expert`) | 31–60 | 6–10 | 3 | 25–45 % |

Le validateur applique ces seuils et vérifie quotas, identifiants et dépendances. Le générateur signale
explicitement un thème qui manque de catégories. Chacun des trois thèmes actuels en fournit cinq au plus.

## Recherche, score et benchmark

Une victoire sans annulation sélectionne exactement une fois chaque objet. La longueur optimale vaut donc le
nombre d’objets et le solveur minimise les passages au tampon. Le niveau généré accorde trois étoiles à cet
optimum, deux étoiles jusqu’à deux passages supplémentaires, puis une étoile au-delà.

En mode `auto`, la recherche utilise BFS à coûts 0 et 1 sous 16 objets restants, et A* à partir de 16.
A* compte une sélection par objet restant et un passage de plus si le prochain coup doit aller au tampon.
Ces deux bornes sont admissibles. Un budget d’états ou de temps dépassé donne `unverified`. Le statut
`unsolvable` exige l’épuisement de la recherche. Seul `solved` autorise la génération d’un niveau publiable.

Le benchmark compte les choix légaux depuis chaque état normalisé atteignable. Une décision est non triviale
quand ses coups légaux ont des coûts optimaux restants différents, le coût d’une branche perdante étant infini.
La part de blocage est le nombre de coups qui mènent à une branche sans victoire divisé par le nombre de coups
légaux comptés, annulation et redémarrage exclus. La durée affichée mesure la recherche de la solution.

## Versions

Le format courant des niveaux est `schemaVersion: "1.1"`. Il est décrit dans
[`packages/schemas/level.schema.json`](../../packages/schemas/level.schema.json). `migrateLevel` précède toute
validation. Pour les données en `"1.0"`, la migration conserve le score en passages déjà présent et complète
`rulesVersion` si nécessaire. Pour l’ancien score en coups, elle soustrait le quota total des cartons des deux
seuils. Ce supplément devient la marge de passages au tampon. Le niveau migré reste soumis à tous les contrôles.
Cette migration s’applique au contrat des niveaux, indépendamment de la version des règles du moteur et du
format de ses instantanés. L’exemple historique de la spécification est conservé intégralement dans les fixtures.
Il est migrable et ses quotas incomplets sont signalés à la validation.
