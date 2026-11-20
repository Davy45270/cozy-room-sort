# Décision de réutilisation : outillage de tests

## Besoin

Deux besoins de test, sans code de production embarqué :

- tests de bout en bout dans de vrais navigateurs (Chromium, Firefox, WebKit), au toucher et au clavier, avec captures
  d'écran, et une commande `level:render` qui produit l'image PNG d'un niveau ;
- vérifier que les schémas JSON publiés (`packages/schemas`) acceptent exactement ce que les types TypeScript
  acceptent : niveaux, catalogue, thèmes.

## Candidats

| Besoin | Candidat | Version | Licence | Constat |
|---|---|---|---|---|
| bout en bout | `@playwright/test` | 1.65.0 | Apache-2.0 | trois moteurs, image de CI officielle avec navigateurs, émulation tactile, captures |
| bout en bout | Cypress | 15 | MIT | Firefox et WebKit partiels, tactile limité, binaire lourd |
| bout en bout | WebdriverIO | 9 | MIT | demande des pilotes par navigateur sur l'hôte de CI |
| schémas JSON | `ajv` | 8.20.0 | MIT | JSON Schema 2020-12 (`ajv/dist/2020`), messages d'erreur complets, sans dépendance native |
| schémas JSON | `@cfworker/json-schema` | 4 | MIT | moins de mots-clés couverts, peu d'usage |
| schémas JSON | validation écrite à la main | — | — | dupliquerait les schémas, sans preuve qu'ils restent justes |

Sources : registre npm et dépôts des projets, consultés le 2026-11-20.

## Choix

`@playwright/test` (racine, et `packages/level-tools` pour `level:render`) et `ajv`. Ce sont des dépendances de
développement : rien n'entre dans l'application publiée. Playwright est déjà la chaîne des autres jeux du mainteneur :
une seule image de CI à maintenir.

## Risques

- Montée de version de Playwright : l'image de `.woodpecker/e2e.yml` doit suivre ; l'étape compare les deux versions et
  s'arrête si elles divergent.
- `ajv` : un changement de comportement sur un mot-clé ferait échouer les tests de concordance, pas le jeu.

## Tests de qualification

`tests/integration/schema-concordance.test.ts`, `tests/unit/schemas/champs-obligatoires.test.ts` (ajv) ;
`tests/e2e/*.spec.ts` et `tests/e2e/render.spec.ts` (Playwright).
