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
  limite de temps si le niveau en fixe une. Pour un tel niveau, l’écran de jeu envoie au contrôleur une action
  `TICK` portant le temps écoulé, chaque seconde (`apps/web/src/game/clock.ts`), jusqu’à la fin de la partie ou la
  sortie de l’écran ; les `TICK` consécutifs se fusionnent dans le journal. Sans limite (`null`, tous les niveaux
  livrés), aucune horloge ne tourne.
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
identifiant de niveau. Une réédition qui conserve cet identifiant conserve la note et le niveau terminé.
Chaque journal de partie porte une empreinte des identifiants et dépendances des objets, de la file des
cartons, du score et des règles appliquées dans le mode courant. La graine, les métadonnées de génération
et la présentation sont indépendantes du rejeu. Si l’empreinte est différente, ou absente (journal d’une version précédente du jeu, qui pourrait se rejouer
vers un autre état que celui enregistré), le chargement écarte la partie en cours et fournit le motif à l’écran de jeu pour annoncer
« Ce niveau a changé : la partie reprend au début. »

En mode `auto`, la recherche utilise BFS à coûts 0 et 1 sous 16 objets restants, et A* à partir de 16.
A* compte une sélection par objet restant et un passage de plus si le prochain coup doit aller au tampon.
Ces deux bornes sont admissibles. Un budget d’états ou de temps dépassé donne `unverified`. Le statut
`unsolvable` exige l’épuisement de la recherche. Seul `solved` autorise la génération d’un niveau publiable.

Le benchmark compte les choix légaux depuis chaque état normalisé atteignable. Une décision est non triviale
quand ses coups légaux ont des coûts optimaux restants différents, le coût d’une branche perdante étant infini.
La part de blocage est le nombre de coups qui mènent à une branche sans victoire divisé par le nombre de coups
légaux comptés, annulation et redémarrage exclus. La durée affichée mesure la recherche de la solution.

## Versions

Le format courant des niveaux est `schemaVersion: "1.2"`. Il est décrit dans
[`packages/schemas/level.schema.json`](../../packages/schemas/level.schema.json). Ce schéma publié et `validateLevel`
rendent le même verdict sur les niveaux livrés et sur un jeu de fixtures invalides
(`tests/integration/schema-concordance.test.ts`) ; tous deux refusent un champ inconnu, hors de `meta`. Contrôles
propres à `validateLevel`, qu’un JSON Schema ne sait pas exprimer : identifiants uniques, catégorie connue d’un
carton ou d’un objet, bloqueur connu et différent de l’objet, absence de cycle de blocage, quotas (objets d’une
catégorie égaux à la capacité de ses cartons), part d’objets masqués selon la difficulté, cartons actifs au plus
égaux au nombre de cartons, seuil trois étoiles au plus égal au seuil deux étoiles, et migration des formats 1.0
et 1.1. La géométrie de la pièce (couches et recouvrements) relève de la CLI. Aucun schéma n’est publié pour les
sauvegardes : leur forme est vérifiée par le stockage de l’application. La CLI vérifie les
couches des bloqueurs et le recouvrement des boîtes utiles des objets. Deux objets liés se recouvrent
d’au moins 25 % de la plus petite boîte utile. Deux objets sans lien se recouvrent de moins de 10 %.
La projection utilise la même échelle pour les positions et les tailles. Le toucher choisit le pixel
opaque le plus en avant, puis cherche la boîte utile la plus proche dans un rayon de 22 px.

`migrateLevel` précède la validation structurelle et migre en mémoire les niveaux `"1.0"` et `"1.1"`.
Pour un fichier historique, la CLI émet un avertissement « format 1.1 migré ; contrôle géométrique appliqué » :
la version déclarée ne dispense d'aucun contrôle. Elle vérifie la géométrie, la structure, le rejeu de la
solution enregistrée si elle existe, la résolution et le seuil de trois étoiles. Un niveau historique dont les
recouvrements contredisent ses dépendances est refusé, avec ce même préfixe suivi de l'erreur de recouvrement.
`level:solve --write` conserve la version du fichier. Les niveaux de `content/levels` sont tous en 1.2
(`tests/integration/levels.test.ts`).

Pour les données en `"1.0"`, la migration conserve le score en passages déjà présent et complète
`rulesVersion` si nécessaire. Pour l’ancien score en coups, elle soustrait le quota total des cartons
des deux seuils. Ce supplément devient la marge de passages au tampon. La migration du contrat des niveaux
est indépendante de la version des règles du moteur et du format de ses instantanés. L’exemple historique de
la spécification est conservé dans les fixtures. Ses quotas incomplets sont signalés à la validation.

### Historique du format

- **1.0** : contrat de la spécification d’origine. Seuils d’étoiles en coups (`threeStarsMaxMoves`,
  `twoStarsMaxMoves`), `rulesVersion` facultatif. Migré en mémoire : seuils convertis en passages au tampon,
  `rulesVersion` complété.
- **1.1** : seuils en passages au tampon (`threeStarsMaxBuffered`, `twoStarsMaxBuffered`), bornes de difficulté
  (objets, catégories, tampon) dans le schéma, mesures du générateur dans `meta`. Migré en mémoire vers 1.2 sans
  changement de contenu.
- **1.2** : exigences géométriques de la pièce (couches des bloqueurs, recouvrements des boîtes utiles) ;
  contrôle géométrique appliqué à tout niveau, quelle que soit la version déclarée ; un champ inconnu hors de
  `meta` est refusé, par le validateur comme par le schéma publié ; un objet masqué a au moins un bloqueur, et
  `meta.solution` et `meta.engineVersion` n’acceptent pas de texte vide, dans le schéma comme dans le validateur.

### Historique des règles (`rulesVersion`)

- **1** : sans coup légal, la partie est bloquée dès que le mode autorise l’annulation.
- **2** : sans coup légal, la partie n’est bloquée que si une annulation reste disponible (quota non épuisé,
  historique non vide) ; sinon elle est perdue. Seule une partie perdue refuse l’annulation : le coup gagnant
  s’annule (R-008). En détente, aucun quota cumulé d’annulations ; seule la profondeur de l’historique
  (200 coups) borne ce qu’on peut défaire. Ces trois changements forment ensemble la version 2, publiée en une fois. Un niveau déclaré en règles 1 est migré en règles 2 à la lecture
  (son contenu ne change pas). La version des règles entre dans l’empreinte des journaux de partie : un journal
  écrit sous les règles 1 reprend au début, avec l’annonce du niveau changé ; les étoiles et niveaux terminés restent.

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
un son est chargé à la première action qui l’utilise. Les deux formats (ogg, mp3) sont au précache du
service worker : un son activé pour la première fois hors ligne est disponible. La préférence de réduction
des animations est indépendante des sons.

Les fichiers OGG et MP3 sont synthétisés hors ligne par `node tools/synth-sons.ts` avec un encodeur
installé localement. Les fichiers et leur licence CC BY 4.0 figurent dans `content/assets/provenance.json`.
