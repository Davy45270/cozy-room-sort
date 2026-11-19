# Règles de jeu et contrat de niveau

## Pièce, cartons et tampon

- **R-001.** Les positions sont normalisées de 0 à 1. Si A nomme B dans `blockedBy`, B a une couche
  `layer` supérieure à celle de A et le recouvre d’au moins 25 % de l’aire de la plus petite boîte utile.
  Deux objets sans lien direct dans un sens ou dans l’autre se recouvrent de moins de 10 % de la plus petite
  boîte. Ces mesures utilisent la projection du rendu dans une zone de référence de 360 × 360 px et les
  boîtes délimitant les pixels non transparents, issues de la provenance des cadres.
- Un objet devient accessible quand tous ses bloqueurs ont quitté la pièce, y compris par le tampon.
  Un objet `hidden` a au moins un bloqueur et apparaît en silhouette sous ses bloqueurs jusqu’à sa libération.
- Le toucher examine les objets accessibles de l’avant vers l’arrière et choisit le premier dont le pixel
  sous le doigt a un alpha non nul. Quand aucun de ces pixels n’est touché, il prend la boîte utile accessible
  la plus proche, jusqu’à 22 px CSS. À distance égale, il choisit l’objet de devant. Dans le catalogue, chaque
  objet accessible garde une zone propre de 44 × 44 px CSS en portrait à 390 × 844 px après chaque coup
  des traces de solution.
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

Le validateur structurel applique ces seuils et vérifie quotas, identifiants et dépendances. La commande
`level:validate` contrôle aussi les couches et les recouvrements avec les boîtes de la provenance, puis résout
le niveau. Le générateur construit les dépendances par piles, les place sur les meubles et le sol et écarte
les candidats qui échouent au contrôle visuel ou à la résolution. Il signale explicitement un thème qui
manque de catégories. Chaque pièce jouable en fournit au moins six.
Dans les trois pièces livrées, le générateur réserve la catégorie Rangements à la difficulté expert
pour conserver les niveaux faciles et moyens existants.

## Recherche, score et benchmark

Une victoire sans annulation sélectionne exactement une fois chaque objet. La longueur optimale vaut donc le
nombre d’objets et le solveur minimise les passages au tampon. Le niveau généré accorde trois étoiles à cet
optimum, deux étoiles jusqu’à deux passages supplémentaires, puis une étoile au-delà.
Les écrans de partie et de victoire calculent les étoiles avec le compteur de passages. Un objet rangé
directement ne l’incrémente pas. Les cartes de niveau affichent la meilleure note enregistrée pour chaque
identifiant de niveau. Une réédition qui conserve cet identifiant conserve la note. Les objets des niveaux
réédités ont de nouveaux identifiants. Une ancienne partie en cours qui contient leurs anciens identifiants
reprend depuis le début.

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

## Bibliothèque et activation de la cuisine

Le catalogue de cadres dans `content/catalog/objets.json` est destiné à la création de contenu.
Il rassemble les objets, meubles et éléments décoratifs découpés, dont les deux chats. Les bacs et cartons
de jeu, les sols, les fonds et les cadres d’interface sont exclus.

La salle de bain occupe provisoirement la troisième place. Pour basculer vers la cuisine :

1. Renseigner la planche et les 30 découpes de `content/assets/planches/source/cuisine-objets.decoupe.json`
   en conservant les identifiants du champ `attendus`.
2. Produire `cuisine-objets.json` et `cuisine-objets.webp` dans `content/assets/planches/atlas/`. Inscrire
   chaque cadre dans la provenance et le catalogue, puis faire contrôler les découpes.
3. Mettre `actif: true` dans `content/themes/cuisine.json`. Le champ `remplace` donne à la cuisine la place
   de la salle de bain dans le sélecteur et les recettes.
4. Exécuter `npm run level:generate -- --catalog --theme cuisine` pour remplacer les six niveaux 015 à 020.
   Le générateur écrit les nouveaux niveaux vérifiés avant de retirer les anciens fichiers des six emplacements.
   Les 14 premiers niveaux conservent leurs identifiants et les niveaux cuisine reçoivent leurs propres identifiants.
5. Exécuter `npm run level:validate -- content/levels`, `npm run build` et `npm run check:precache`, puis
   contrôler les captures de l’application.

## Sons

Le réglage **Sons** est désactivé à l’installation et enregistré dans IndexedDB. Une fois activé,
un son est chargé à la première action qui l’utilise. Le service worker met le fichier entier en cache
à la demande. La préférence de réduction des animations est indépendante des sons.

Les fichiers OGG et MP3 sont synthétisés hors ligne par `node tools/synth-sons.ts` avec un encodeur
installé localement. Les fichiers et leur licence CC BY 4.0 figurent dans `content/assets/provenance.json`.
