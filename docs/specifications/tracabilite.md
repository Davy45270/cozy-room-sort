# Traçabilité des spécifications

Matrice de la version 0.1 du 18 novembre 2026, complétée par les décisions sur la cuisine, le score et les sons.
Les noms sont ceux déclarés par les tests, sans le préfixe du groupe `describe`. Pour un test paramétré, le nom
indique un cas exécuté ou le modèle de nom déclaré par le test. La couverture partielle et les parcours à venir
sont indiqués dans la même colonne.

| Exigence | Chemin du test > nom exact du test |
| --- | --- |
| §1 · Jeu de rangement et de tri en 2D | `tests/e2e/play.spec.ts` > `gagner le premier niveau en suivant la meilleure solution donne trois étoiles` |
| §1 · Identité, code, illustrations et niveaux originaux | `tests/integration/brand-guard.test.ts` > `public text has no commercial names or internal ticket identifiers`. Non couvert : comparaison manuelle des illustrations, du code et des niveaux. |
| §1 · Public familial dès 7 ans | Non couvert : évaluation auprès du public visé. |
| §1 · Mobile en priorité, bureau compatible | `tests/e2e/layout.spec.ts` > `001-salon : ni défilement horizontal, ni bouton ou carton hors de l'écran`<br>`tests/e2e/layout.spec.ts` > `l’accueil répartit la vue et les actions sur deux colonnes`. |
| §1 · Jeu utilisable hors ligne | `tests/e2e/offline.spec.ts` > `hors ligne, la page s'ouvre et la partie reprend au même coup` |
| §1 · PWA installable | Non couvert : installation native et lancement depuis le système. Le build produit le manifeste et le service worker. |
| §1 · Aucun compte | `tests/integration/project-guards.test.ts` > `garde l’interface sans compte, connexion, publicité ni énergie` |
| §1 · Aucune publicité | `tests/integration/project-guards.test.ts` > `garde l’interface sans compte, connexion, publicité ni énergie` |
| §1 · Aucune énergie | `tests/integration/project-guards.test.ts` > `garde l’interface sans compte, connexion, publicité ni énergie` |
| §1 · Code MIT et art original sous licence CC BY 4.0 | `tests/integration/provenance.test.ts` > `chaque cadre possède une provenance et une boîte utile dans ses dimensions`. Non couvert : vérification juridique des droits et du texte MIT. |
| §1 · Modes détente, classique et expert | `tests/unit/engine/history.test.ts` > `withMode applique les valeurs de départ et ne touche pas au niveau d'origine` |
| §1 · Vingt niveaux et trois univers au MVP | `tests/integration/levels.test.ts` > `vingt niveaux répartis sur les trois pièces` |
| §1 · Moteur déterministe testé | `tests/unit/engine/serialize.test.ts` > `T-008 / R-010 : mêmes niveau et actions, même résultat` |
| §1 · Solveur de référence | `tests/unit/solver/solver.test.ts` > `résout un niveau facile avec une trace minimale et rejouable` |
| §1 · Éditeur complet et cent niveaux après le MVP | Non couvert : périmètre futur. |
| §2 · Observer la pièce et sélectionner un objet | `tests/e2e/play.spec.ts` > `gagner le premier niveau en suivant la meilleure solution donne trois étoiles` |
| §2 · R-001 · Seuls les objets visibles, accessibles et non bloqués sont sélectionnables | `tests/unit/engine/select.test.ts` > `T-011 / R-001 : un objet masqué sous un autre n'est pas sélectionnable` |
| §2 · R-002 · Rangement dans un carton actif compatible avec une place libre | `tests/unit/engine/select.test.ts` > `T-001 / R-002 : un objet compatible incrémente le carton` |
| §2 · R-003 · Transfert au tampon si aucun carton ne convient et qu’une place est libre | `tests/unit/engine/select.test.ts` > `T-002 / R-003 : un objet incompatible va au tampon` |
| §2 · R-004 · Fermeture du carton plein et activation du suivant | `tests/unit/engine/select.test.ts` > `T-004 / R-004 : un carton plein se ferme et le suivant s'active au même emplacement` |
| §2 · R-005 · Vidage automatique et déterministe du tampon | `tests/unit/engine/history.test.ts` > `T-005 / R-005 : cascade, le nouveau carton prend ce qui attend dans le tampon, dans l'ordre d'arrivée` |
| §2 · R-006 · Refus sans mutation si tampon plein, statut selon les coups restant légaux | `tests/unit/engine/select.test.ts` > `T-003 / R-006 : tampon plein et objet incompatible, coup refusé sans mutation`<br>`tests/unit/engine/select.test.ts` > `sans coup légal : allowUndo true donne blocked`<br>`tests/unit/engine/select.test.ts` > `sans coup légal : allowUndo false donne lost` |
| §2 · R-007 · Victoire lorsque les quotas sont satisfaits et la pièce et le tampon vides | `tests/unit/engine/select.test.ts` > `T-006 / R-007 : le dernier objet rangé donne la victoire, une seule fois, avec les étoiles` |
| §2 · R-008 · Au moins dix annulations en détente | `tests/unit/engine/history.test.ts` > `R-008 : mode détente, 10 annulations successives` |
| §2 · R-009 · Indice égal à un coup valide issu du solveur | `tests/unit/solver/solver.test.ts` > `R-009 : l'indice est un coup légal ; aucun indice depuis un état bloqué` |
| §2 · R-010 · Déterminisme à niveau, règles, état initial et actions égaux | `tests/unit/engine/serialize.test.ts` > `T-008 / R-010 : mêmes niveau et actions, même résultat` |
| §3 · Monorepo TypeScript strict | `tests/integration/project-guards.test.ts` > `compile en TypeScript strict` |
| §3 · Vite, rendu Phaser et PWA | `tests/e2e/offline.spec.ts` > `hors ligne, la page s'ouvre et la partie reprend au même coup`. Non couvert : vérification automatisée du choix précis de chaque outil. |
| §3 · Interface et rendu séparés du moteur, du solveur, du générateur et des schémas | `tests/integration/engine-purity.test.ts` > `engine purity is enforced by lint in %s` |
| §3 · Contrôleur séquentiel distinct et relecture des saves | `tests/unit/web/controller.test.ts` > `deux sélections rapides : deux transitions dans l'ordre et deux sauvegardes`<br>`tests/unit/web/controller.test.ts` > `reprend une partie sauvegardée` |
| §3 · Persistance IndexedDB | `tests/unit/web/storage.test.ts` > `aller-retour des progrès, des parties et des réglages` |
| §3 · Aucun serveur obligatoire, hébergement statique | `tests/e2e/offline.spec.ts` > `hors ligne, la page s'ouvre et la partie reprend au même coup` |
| §3 · Contrat JSON Schema et validation | `tests/unit/schemas/validate.test.ts` > `accepte le niveau minimal valide`. Non couvert : parité exhaustive du document JSON Schema et du validateur TypeScript. |
| §3 · Infrastructure de tests unitaires, propriétés et navigateur | `tests/integration/project-guards.test.ts` > `le monorepo contient les applications, paquets, contenus, outils, tests et guides du MVP` |
| §3 · Arborescence des applications, paquets, contenus, outils, tests et guides | `tests/integration/project-guards.test.ts` > `le monorepo contient les applications, paquets, contenus, outils, tests et guides du MVP` |
| §3 · CI et configuration à la racine | `tests/integration/project-guards.test.ts` > `le monorepo contient les applications, paquets, contenus, outils, tests et guides du MVP`. Le projet utilise Woodpecker. |
| §3 · Éditeur et empaquetage natif | Non couvert : périmètre futur. |
| §3 · Aucune dépendance ni sous-module externe au projet et au registre | `tests/integration/project-guards.test.ts` > `utilise les paquets locaux ou leurs versions de registre et aucun sous-module` |
| §4 · Contrat versionné, exemple partiel et migration | `tests/unit/schemas/migrate.test.ts` > `migre le contrat historique et diagnostique son quota incomplet` |
| §4 · Identifiants uniques et références aux catégories | `tests/unit/schemas/validate.test.ts` > `rejette un identifiant en double`<br>`tests/unit/schemas/validate.test.ts` > `rejette une catégorie inconnue` |
| §4 · Cartons, capacités, tampon et quotas cohérents | `tests/unit/schemas/validate.test.ts` > `rejette un quota qui ne tombe pas juste`<br>`tests/unit/schemas/validate.test.ts` > `rejette plus de cartons actifs que de cartons` ; rejette un tampon de %i places |
| §4 · Positions normalisées, couches et dépendances valides | `tests/unit/schemas/validate.test.ts` > `rejette une position hors de [0, 1]`<br>`tests/unit/schemas/validate.test.ts` > `rejette un bloqueur absent`<br>`tests/unit/schemas/validate.test.ts` > `rejette un cycle de blocage en citant les objets`. Non couvert : cas isolé d’une couche invalide. |
| §4 · Seuils d’étoiles ordonnés, score actuel en passages au tampon | `tests/unit/schemas/validate.test.ts` > `rejette des seuils d'étoiles inversés`.<br>`tests/unit/engine/select.test.ts` > `étoiles : comptées en passages par le tampon` |
| §5 · État versionné, identifiant du niveau et journal rejouable | `tests/unit/engine/serialize.test.ts` > `T-010 : restaurer une sauvegarde rend l'état identique`<br>`tests/unit/engine/serialize.test.ts` > `refuse une sauvegarde d'un autre niveau ou d'autres règles` |
| §5 · États en jeu, bloqué, gagné et perdu | `tests/unit/engine/select.test.ts` > `T-006 / R-007 : le dernier objet rangé donne la victoire, une seule fois, avec les étoiles`<br>`tests/unit/engine/select.test.ts` > `sans coup légal : allowUndo true donne blocked`<br>`tests/unit/engine/select.test.ts` > `sans coup légal : allowUndo false donne lost` |
| §5 · Inventaire, cartons actifs, en attente et fermés, capacités et tampon | `tests/property/invariants.test.ts` > `emplacement unique, capacités respectées, refus sans mutation, victoire conforme et catégories compatibles`.<br>`tests/unit/engine/select.test.ts` > `T-004 / R-004 : un carton plein se ferme et le suivant s'active au même emplacement` |
| §5 · Compteurs de coups et d’indices et historique | `tests/unit/engine/select.test.ts` > `moveCount n'augmente que sur un coup accepté`.<br>`tests/unit/engine/history.test.ts` > `HINT_USED compte les indices et respecte la limite`<br>`tests/unit/engine/history.test.ts` > `T-007 : UNDO rend l'état précédent` |
| §5 · Commandes SELECT_OBJECT, UNDO et RESTART | `tests/unit/engine/select.test.ts` > `T-001 / R-002 : un objet compatible incrémente le carton`.<br>`tests/unit/engine/history.test.ts` > `T-007 : UNDO rend l'état précédent`<br>`tests/unit/engine/history.test.ts` > `RESTART rend l'état initial` |
| §5 · Fonction applyAction, transition composée de l’état et des événements | `tests/unit/engine/select.test.ts` > `T-001 / R-002 : un objet compatible incrémente le carton` |
| §5 · Événements OBJECT_BUFFERED et OBJECT_PACKED | `tests/unit/engine/select.test.ts` > `T-002 / R-003 : un objet incompatible va au tampon`<br>`tests/unit/engine/select.test.ts` > `T-001 / R-002 : un objet compatible incrémente le carton` |
| §5 · Événements BOX_COMPLETED et BOX_ACTIVATED | `tests/unit/engine/select.test.ts` > `T-004 / R-004 : un carton plein se ferme et le suivant s'active au même emplacement` |
| §5 · Événements LEVEL_WON et ACTION_REJECTED | `tests/unit/engine/select.test.ts` > `T-006 / R-007 : le dernier objet rangé donne la victoire, une seule fois, avec les étoiles`<br>`tests/unit/engine/select.test.ts` > `T-003 / R-006 : tampon plein et objet incompatible, coup refusé sans mutation` |
| §5 · Moteur pur et temps externe | `tests/integration/engine-purity.test.ts` > `engine purity is enforced by lint in packages/engine/src`.<br>`tests/unit/engine/history.test.ts` > `TICK avance le temps sans toucher à l'historique, et la limite de temps fait perdre` |
| §6 · BFS sur petits niveaux et A* sur grands niveaux | `tests/property/solver.test.ts` > `les deux stratégies donnent le même optimum sur 50 niveaux engendrés` |
| §6 · État normalisé et empreinte déterministe | `tests/unit/solver/solver.test.ts` > `l'empreinte ignore l'ordre de la pièce mais pas celui du tampon` |
| §6 · Blocages et impossibilité | `tests/unit/solver/solver.test.ts` > `T-009 : un niveau impossible est rejeté comme insoluble` |
| §6 · Trace de solution et optimalité | `tests/unit/solver/solver.test.ts` > `minimise les passages par le tampon, là où un parcours naïf en compterait un`.<br>`tests/property/solver.test.ts` > `invariant : toute trace du solveur se rejoue jusqu'à la victoire` |
| §6 · Budgets réglables en états et en temps | `tests/unit/solver/solver.test.ts` > `un budget d'états dépassé rend « non vérifié », jamais « insoluble »`<br>`tests/unit/solver/solver.test.ts` > `un budget de temps dépassé rend « non vérifié »` |
| §6 · Choix du thème, de la difficulté, des catégories, des cadres, des positions et des dépendances | `tests/unit/generator/generator.test.ts` > `T-008 : même graine, même niveau avec trace gagnante et mesures de difficulté`.<br>`tests/integration/assets-niveaux.test.ts` > `chaque cadre de thème existe et chaque objet appartient à sa catégorie dans sa pièce` |
| §6 · Quotas exacts et validation de la structure | `tests/unit/schemas/validate.test.ts` > `rejette un quota qui ne tombe pas juste`.<br>`tests/integration/tools.test.ts` > `level:generate : génère uniquement des niveaux validés, avec les alias des pièces` |
| §6 · Exécution du solveur et rejet des candidats insolubles | `tests/unit/generator/generator.test.ts` > `rejette un candidat structurellement valide mais insoluble` |
| §6 · Rejet des candidats non vérifiés | `tests/unit/generator/generator.test.ts` > `rejette un candidat non vérifié quand le budget est épuisé` |
| §6 · Publication du JSON, de la graine, de la version moteur et de la trace | `tests/integration/levels.test.ts` > `le catalogue est identique aux recettes du générateur`.<br>`tests/unit/generator/generator.test.ts` > `T-008 : même graine, même niveau avec trace gagnante et mesures de difficulté` |
| §6 · Seuils du niveau facile | `tests/unit/schemas/validate.test.ts` > `vérifie les bornes de difficulté easy sur des quotas cohérents` |
| §6 · Seuils du niveau moyen | `tests/unit/schemas/validate.test.ts` > `vérifie les bornes de difficulté medium sur des quotas cohérents` |
| §6 · Seuils du niveau expert | `tests/unit/schemas/validate.test.ts` > `vérifie les bornes de difficulté expert sur des quotas cohérents`.<br>`tests/integration/levels.test.ts` > `T16 : %s génère et livre un niveau expert valide, résolu par A*` |
| §6 · Comptage des états, décisions non triviales et risque de blocage | `tests/integration/tools.test.ts` > `level:benchmark : mesure les décisions et les issues bloquantes sur un petit niveau` |
| §6 · Validation finale par schéma, moteur et solveur | `tests/integration/levels.test.ts` > `%s : valide, solution rejouée jusqu'à la victoire` |
| §7 · Direction artistique chaleureuse et pièces distinctes | `tests/e2e/theme.spec.ts` > `le thème suit le système, et le réglage « Clair » l'emporte`. Non couvert : appréciation de la direction artistique. |
| §7 · Salon et chambre jouables | `tests/integration/levels.test.ts` > `vingt niveaux répartis sur les trois pièces` |
| §7 · Cuisine, café et atelier | `tests/integration/cuisine.test.ts` > `un thème inactif est absent du sélecteur, du générateur et des niveaux livrés`<br>`tests/integration/cuisine.test.ts` > `la cuisine attend exactement les trente cadres déclarés dans la table de découpe vide`. Non couvert : les graphismes de cuisine, le café et l’atelier restent à produire. |
| §7 · Objets indépendants et décors en couches | `tests/unit/web/layout.test.ts` > `un bloqueur est dessiné après (au-dessus de) l'objet qu'il recouvre` |
| §7 · Images objets transparentes en atlas et interface illustrée | `tests/integration/no-code-art.test.ts` > `les illustrations du jeu proviennent des atlas`. Les planches recadrées servent aussi à l’interface. Non couvert : test du canal alpha et interface SVG envisagée dans la version initiale. |
| §7 · Animations par déplacement ou planches | Non couvert : contrôle automatisé de l’animation et de ses trajectoires. |
| §7 · Audio OGG et MP3 synthétisé | `tests/integration/sons.test.ts` > `T10 : quatre sons courts sont livrés en OGG et MP3 sous 30 ko` |
| §7 · Audio désactivé par défaut, activation persistante et absence de lecture sans activation | `tests/unit/web/sons.test.ts` > `T10 : les sons sont coupés à l’installation et activés par un réglage persistant`<br>`tests/unit/web/sons.test.ts` > `T10 : aucun chargement et aucun play() quand les sons sont coupés` |
| §7 · Dimensions, ancre, boîte utile, origine et licence de chaque cadre | `tests/integration/provenance.test.ts` > `chaque cadre possède une provenance et une boîte utile dans ses dimensions` |
| §7 · Bibliothèque d’environ 150 objets et au moins dix catégories | `tests/integration/catalogue.test.ts` > `T19 : tous les cadres d’objets et de meubles sont catalogués une seule fois dans au moins dix catégories`. Les planches livrées fournissent 130 cadres catalogués. |
| §7 · Détourage, normalisation et intégration en atlas | `tests/integration/provenance.test.ts` > `chaque cadre possède une provenance et une boîte utile dans ses dimensions`. Non couvert : automatisation de toutes les étapes de fabrication. |
| §7 · Contrôle humain et originalité des contributions | Non couvert : validation humaine des illustrations, des droits et des niveaux. |
| §8 · Éditeur visuel et ses fonctions de placement, règles et essai | Non couvert : périmètre futur. |
| §8 · level:validate | `tests/integration/tools.test.ts` > `level:validate accepte un niveau valide et soluble`<br>`tests/integration/tools.test.ts` > `level:validate refuse un cycle et un niveau insoluble` |
| §8 · level:solve | `tests/integration/tools.test.ts` > `level:solve --write enregistre une solution rejouable` |
| §8 · level:generate | `tests/integration/tools.test.ts` > `level:generate : génère uniquement des niveaux validés, avec les alias des pièces`<br>`tests/integration/tools.test.ts` > `level:generate --catalog --theme : régénère les six niveaux du troisième univers` |
| §8 · level:render et capture exploitable | `tests/e2e/render.spec.ts` > `level:render : la commande produit une capture PNG de la pièce et de ses objets` |
| §8 · level:benchmark | `tests/integration/tools.test.ts` > `level:benchmark : mesure les décisions et les issues bloquantes sur un petit niveau` |
| §9 · T-001 · Objet compatible, carton incrémenté | `tests/unit/engine/select.test.ts` > `T-001 / R-002 : un objet compatible incrémente le carton` |
| §9 · T-002 · Objet incompatible, passage au tampon | `tests/unit/engine/select.test.ts` > `T-002 / R-003 : un objet incompatible va au tampon` |
| §9 · T-003 · Tampon plein, refus sans mutation | `tests/unit/engine/select.test.ts` > `T-003 / R-006 : tampon plein et objet incompatible, coup refusé sans mutation` |
| §9 · T-004 · Carton plein, suivant activé | `tests/unit/engine/select.test.ts` > `T-004 / R-004 : un carton plein se ferme et le suivant s'active au même emplacement` |
| §9 · T-005 · Objet compatible du tampon transféré automatiquement | `tests/unit/engine/history.test.ts` > `T-005 / R-005 : cascade, le nouveau carton prend ce qui attend dans le tampon, dans l'ordre d'arrivée` |
| §9 · T-006 · Objets rangés, victoire | `tests/unit/engine/select.test.ts` > `T-006 / R-007 : le dernier objet rangé donne la victoire, une seule fois, avec les étoiles` |
| §9 · T-007 · Annulation et état précédent | `tests/unit/engine/history.test.ts` > `T-007 : UNDO rend l'état précédent` |
| §9 · T-008 · Même graine et mêmes actions, résultat identique | `tests/unit/generator/generator.test.ts` > `T-008 : même graine, même niveau avec trace gagnante et mesures de difficulté`.<br>`tests/unit/engine/serialize.test.ts` > `T-008 / R-010 : mêmes niveau et actions, même résultat` |
| §9 · T-009 · Niveau impossible rejeté par le solveur | `tests/unit/solver/solver.test.ts` > `T-009 : un niveau impossible est rejeté comme insoluble` |
| §9 · T-010 · État identique après sauvegarde et restauration | `tests/unit/engine/serialize.test.ts` > `T-010 : restaurer une sauvegarde rend l'état identique` |
| §9 · T-011 · Objet masqué non sélectionnable | `tests/unit/engine/select.test.ts` > `T-011 / R-001 : un objet masqué sous un autre n'est pas sélectionnable` |
| §9 · T-012 · Diagnostic explicite d’un JSON malformé sans exception | `tests/unit/schemas/validate.test.ts` > `T-012 : un JSON malformé donne une erreur explicite sans exception` |
| §9 · Invariant d’emplacement logique unique | `tests/property/invariants.test.ts` > `emplacement unique, capacités respectées, refus sans mutation, victoire conforme et catégories compatibles` |
| §9 · Invariant de capacité des cartons et du tampon | `tests/property/invariants.test.ts` > `emplacement unique, capacités respectées, refus sans mutation, victoire conforme et catégories compatibles` |
| §9 · Invariant de refus sans mutation | `tests/property/invariants.test.ts` > `emplacement unique, capacités respectées, refus sans mutation, victoire conforme et catégories compatibles` |
| §9 · Invariant de victoire conforme | `tests/property/invariants.test.ts` > `emplacement unique, capacités respectées, refus sans mutation, victoire conforme et catégories compatibles` |
| §9 · Invariant de rejeu intégral de la trace du solveur | `tests/property/solver.test.ts` > `invariant : toute trace du solveur se rejoue jusqu'à la victoire` |
| §9 · 60 FPS sur téléphone milieu de gamme | `tests/e2e/performance.spec.ts` > `T20 : fréquence des images, chargement après cache et latence d’un rangement`. Seuil de 50 FPS en CI. Non couvert : mesure sur appareil physique. |
| §9 · Chargement après cache inférieur à trois secondes | `tests/e2e/performance.spec.ts` > `T20 : fréquence des images, chargement après cache et latence d’un rangement` |
| §9 · Interaction inférieure à 100 ms | `tests/e2e/performance.spec.ts` > `T20 : fréquence des images, chargement après cache et latence d’un rangement` |
| §9 · Tous les niveaux publiés passent le solveur | `tests/integration/levels.test.ts` > `%s : valide, solution rejouée jusqu'à la victoire`. Commande de CI `npm run level:validate -- content/levels`. |
| §10 · Phase 1 · Monorepo, schémas, moteur, invariants et tests | `tests/integration/project-guards.test.ts` > `le monorepo contient les applications, paquets, contenus, outils, tests et guides du MVP`.<br>`tests/property/invariants.test.ts` > `emplacement unique, capacités respectées, refus sans mutation, victoire conforme et catégories compatibles` |
| §10 · Phase 2 · Rendu, tactile, menus, animations, sauvegarde et vingt niveaux | `tests/e2e/play.spec.ts` > `gagner le premier niveau en suivant la meilleure solution donne trois étoiles`.<br>`tests/e2e/offline.spec.ts` > `hors ligne, la page s'ouvre et la partie reprend au même coup`.<br>`tests/integration/levels.test.ts` > `vingt niveaux répartis sur les trois pièces`. Non couvert : animation vérifiée séparément. |
| §10 · Phase 3 · Solveur, génération, métriques, commandes et agents | Les tests de §6 et §8 couvrent calcul et commandes. Non couvert : workflow des agents. |
| §10 · Phase 4 · Éditeur, univers, assets et cent niveaux | `tests/integration/catalogue.test.ts` > `T19 : tous les cadres d’objets et de meubles sont catalogués une seule fois dans au moins dix catégories`. Non couvert : éditeur, extension des univers et cent niveaux. |
| §10 · Phase 5 · PWA, Android, accessibilité, i18n, optimisation et livraison | `tests/e2e/offline.spec.ts` > `hors ligne, la page s'ouvre et la partie reprend au même coup`.<br>`tests/e2e/play.spec.ts` > `on joue au clavier par la liste des objets à portée`.<br>`tests/e2e/performance.spec.ts` > `T20 : fréquence des images, chargement après cache et latence d’un rangement`. Non couvert : application Android, traduction et publication. |
| §10 · Priorité P0 · Architecture, gameplay, schémas et niveaux | Les tests de §2, §3, §4 et §9 couvrent les composants. Non couvert : ordre de priorité. |
| §10 · Priorité P1 · Solveur, génération, assistance, UX, sauvegarde et assets | Les tests de §6 et §7 et les parcours E2E couvrent les composants livrés. Non couvert : automatisation des contributions assistées. |
| §10 · Priorité P2 · Éditeur, extension, packaging et partage | Non couvert : périmètre futur. |
| §10 · Estimations et validation graphique | Non couvert : planification et décision humaine. |
| §11 · Moteur hors du rendu et du DOM | `tests/integration/engine-purity.test.ts` > `engine purity is enforced by lint in packages/engine/src`. Non couvert : inspection exhaustive du rendu pour détecter une duplication de règles. |
| §11 · Tests associés aux modifications du moteur | `tests/property/invariants.test.ts` > `emplacement unique, capacités respectées, refus sans mutation, victoire conforme et catégories compatibles`. Non couvert : appariement automatisé de chaque changement à un test. |
| §11 · Niveaux validés et résolus avant publication | `tests/integration/tools.test.ts` > `level:generate : génère uniquement des niveaux validés, avec les alias des pièces`.<br>`tests/unit/generator/generator.test.ts` > `rejette un candidat non vérifié quand le budget est épuisé` |
| §11 · Aucune dépendance provenant du projet de référence | `tests/integration/project-guards.test.ts` > `utilise les paquets locaux ou leurs versions de registre et aucun sous-module` |
| §11 · Aucun modèle de langage pendant la partie | `tests/integration/project-guards.test.ts` > `garde l’interface et le contenu sans URL externe`. Non couvert : détection spécifique d’un modèle embarqué. |
| §11 · Schéma versionné et migration | `tests/unit/schemas/migrate.test.ts` > `migre le contrat historique et diagnostique son quota incomplet` |
| §11 · Provenance et licences des assets | `tests/integration/provenance.test.ts` > `chaque cadre possède une provenance et une boîte utile dans ses dimensions` |
| §11 · Rapports de tests et vérification visuelle par captures | `tests/e2e/layout.spec.ts` > `001-salon : ni défilement horizontal, ni bouton ou carton hors de l'écran`. Non couvert : validation humaine des captures et du rapport. |
| §11 · Garde des URL externes, y compris les index d’atlas | `tests/integration/project-guards.test.ts` > `garde l’interface et le contenu sans URL externe` |
| §11 · Plafond gzip, bibliothèque et sons hors du précache | Contrôle exécutable sans Vitest dans `scripts/check-precache.js`, par `npm run check:precache` ; il exige aussi l’atlas `p04-quotas` au manifeste du service worker.<br>`tests/integration/precache-panneau-sdb.test.ts` > `l’atlas du panneau entre au précache : ni exclu du build, ni chargé à la demande, plafond inchangé` |
| §12 · Superpositions, visibilité et sélection | `tests/unit/web/layout.test.ts` > `un bloqueur est dessiné après (au-dessus de) l'objet qu'il recouvre`.<br>`tests/unit/engine/select.test.ts` > `T-011 / R-001 : un objet masqué sous un autre n'est pas sélectionnable` |
| §12 · Ordre du vidage et arbitrage entre cartons actifs | `tests/unit/engine/history.test.ts` > `le tampon se vide dans l'ordre d'arrivée et garde ce qui ne convient pas`.<br>`tests/unit/engine/select.test.ts` > `va au premier emplacement compatible, puis au second quand le premier est plein` |
| §12 · Blocage récupérable et échec définitif | `tests/unit/engine/select.test.ts` > `sans coup légal : allowUndo true donne blocked`<br>`tests/unit/engine/select.test.ts` > `sans coup légal : allowUndo false donne lost` |
| §12 · Politique en cas de dépassement du temps du solveur | `tests/unit/solver/solver.test.ts` > `un budget de temps dépassé rend « non vérifié »` |
| §12 · Seuils de difficulté | `tests/unit/schemas/validate.test.ts` > `vérifie les bornes de difficulté %s sur des quotas cohérents` |
| §12 · Étoiles en passages au tampon et meilleure note par niveau | `tests/unit/engine/select.test.ts` > `étoiles : comptées en passages par le tampon`.<br>`tests/unit/web/storage.test.ts` > `une meilleure note n'est jamais écrasée par une moins bonne` |
| §12 · Licence et nom définitifs | `tests/integration/provenance.test.ts` > `chaque cadre possède une provenance et une boîte utile dans ses dimensions`.<br>`tests/integration/brand-guard.test.ts` > `public text has no commercial names or internal ticket identifiers`. Non couvert : validation juridique. |
| §13 · PWA jouable sur mobile, bureau et hors ligne | `tests/e2e/layout.spec.ts` > `001-salon : ni défilement horizontal, ni bouton ou carton hors de l'écran`<br>`tests/e2e/layout.spec.ts` > `l’accueil répartit la vue et les actions sur deux colonnes`.<br>`tests/e2e/offline.spec.ts` > `hors ligne, la page s'ouvre et la partie reprend au même coup` |
| §13 · Vingt niveaux complets, validés et répartis en trois univers | `tests/integration/levels.test.ts` > `vingt niveaux répartis sur les trois pièces`<br>`tests/integration/levels.test.ts` > `%s : valide, solution rejouée jusqu'à la victoire` |
| §13 · Sauvegarde locale | `tests/unit/web/storage.test.ts` > `aller-retour des progrès, des parties et des réglages` |
| §13 · Annulation | `tests/e2e/play.spec.ts` > `annuler rend au tampon l'état d'avant` |
| §13 · Indices | `tests/unit/web/controller.test.ts` > `l'indice rend le premier coup d'une meilleure solution` |
| §13 · CI verte | Non couvert : état des exécutions à constater dans Woodpecker. |
| §13 · Tests unitaires, de propriétés et E2E | `tests/integration/project-guards.test.ts` > `le monorepo contient les applications, paquets, contenus, outils, tests et guides du MVP` |
| §13 · Documentation d’installation et de contribution | `tests/integration/project-guards.test.ts` > `le monorepo contient les applications, paquets, contenus, outils, tests et guides du MVP`. Non couvert : essai des instructions sur un environnement neuf. |
| §13 · Aucun composant propriétaire issu du projet de référence | `tests/integration/project-guards.test.ts` > `utilise les paquets locaux ou leurs versions de registre et aucun sous-module`. Non couvert : audit juridique des dépendances. |
