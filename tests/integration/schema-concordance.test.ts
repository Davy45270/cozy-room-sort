// Le schéma publié (packages/schemas/level.schema.json) fait foi pour les tiers : il rend le même verdict que validate.ts
// sur les niveaux livrés et sur un jeu de fixtures, sauf pour les contrôles qu'un JSON Schema ne sait pas exprimer.
import { readdirSync, readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { validateLevel } from '@cozy-room-sort/schemas';

type Json = Record<string, unknown> & { objects: Record<string, unknown>[]; categories: Record<string, unknown>[];
    boxes: Record<string, unknown>[]; rules: Record<string, unknown>; scoring: Record<string, unknown>; meta: Record<string, unknown> };

const schema = JSON.parse(readFileSync('packages/schemas/level.schema.json', 'utf8')) as object;
const ajv = new Ajv2020({ allErrors: true, strict: false });
const schemaAccepts = ajv.compile(schema);
const validatorAccepts = (level: unknown): boolean => validateLevel(level).ok;

// Niveau de base : 002-salon, facile, dix objets dont un masqué (pile-6) sous son bloqueur.
const base = (): Json => JSON.parse(readFileSync('content/levels/002-salon.json', 'utf8')) as Json;
const edit = (change: (level: Json) => void): Json => { const level = base(); change(level); return level; };

/** Formes que les deux validateurs doivent juger de la même façon. */
const cases: [string, boolean, Json][] = [
    ['niveau intact', true, base()],
    ['limite de temps positive', true, edit(l => { l.rules['timeLimitSeconds'] = 30; })],
    ['champ libre dans meta', true, edit(l => { l.meta['note'] = 'libre'; })],
    ['name retiré', false, edit(l => { delete l['name']; })],
    ['name vide', false, edit(l => { l['name'] = ''; })],
    ['categories[].label retiré', false, edit(l => { delete l.categories[0]!['label']; })],
    ['objects[].asset retiré', false, edit(l => { delete l.objects[0]!['asset']; })],
    ['objects[].blockedBy retiré', false, edit(l => { delete l.objects[0]!['blockedBy']; })],
    ['rules retiré', false, edit(l => { delete (l as Record<string, unknown>)['rules']; })],
    ['scoring retiré', false, edit(l => { delete (l as Record<string, unknown>)['scoring']; })],
    ['seed décimale', false, edit(l => { l['seed'] = 1.5; })],
    ['seed en texte', false, edit(l => { l['seed'] = '42'; })],
    ['layer en texte', false, edit(l => { l.objects[0]!['layer'] = '3'; })],
    ['allowUndo en texte', false, edit(l => { l.rules['allowUndo'] = 'oui'; })],
    ['hidden en texte', false, edit(l => { l.objects[0]!['hidden'] = 'non'; })],
    ['position x > 1', false, edit(l => { (l.objects[0]!['position'] as Record<string, number>)['x'] = 1.2; })],
    ['position y < 0', false, edit(l => { (l.objects[0]!['position'] as Record<string, number>)['y'] = -0.1; })],
    ['position sans y', false, edit(l => { delete (l.objects[0]!['position'] as Record<string, number>)['y']; })],
    ['capacité 0', false, edit(l => { l.boxes[0]!['capacity'] = 0; })],
    ['tampon de 9 places', false, edit(l => { l.rules['bufferCapacity'] = 9; })],
    ['tampon hors difficulté', false, edit(l => { l.rules['bufferCapacity'] = 4; })],
    ['difficulté inconnue', false, edit(l => { l['difficulty'] = 'legendary'; })],
    ['limite de temps nulle', false, edit(l => { l.rules['timeLimitSeconds'] = 0; })],
    ['limite de temps fractionnaire', false, edit(l => { l.rules['timeLimitSeconds'] = 0.2; })],
    ['limite de temps 1,5 s', false, edit(l => { l.rules['timeLimitSeconds'] = 1.5; })],
    ['limite de temps 1 s', true, edit(l => { l.rules['timeLimitSeconds'] = 1; })],
    ['undoLimit négatif', false, edit(l => { l.rules['undoLimit'] = -1; })],
    ['seuil négatif', false, edit(l => { l.scoring['twoStarsMaxBuffered'] = -1; })],
    ['ancien seuil en coups', false, edit(l => { l.scoring['threeStarsMaxMoves'] = 12; })],
    ['version de schéma inconnue', false, edit(l => { l['schemaVersion'] = '9.9'; })],
    ['version des règles inconnue', false, edit(l => { l['rulesVersion'] = '2'; })],
    ['aucun carton', false, edit(l => { l.boxes = []; })],
    ['objet masqué sans bloqueur', false, edit(l => { const hidden = l.objects.find(o => o['hidden'] === true)!; hidden['blockedBy'] = []; })],
    ['solution avec un identifiant vide', false, edit(l => { l.meta['solution'] = ['']; })],
    ['engineVersion vide', false, edit(l => { l.meta['engineVersion'] = ''; })],
    ['blockingMoveShare > 1', false, edit(l => { l.meta['blockingMoveShare'] = 1.5; })],
    ['statesExplored décimal', false, edit(l => { l.meta['statesExplored'] = 2.5; })],
    ['meta en liste', false, edit(l => { l['meta'] = [] as never; })],
    ['champ inconnu à la racine', false, edit(l => { l['auteur'] = 'tiers'; })],
    ['champ inconnu dans rules', false, edit(l => { l.rules['gravity'] = 1; })],
    ['« hidden » mal orthographié', false, edit(l => { l.objects[0]!['hiden'] = true; })],
    ['champ inconnu dans une catégorie', false, edit(l => { l.categories[0]!['color'] = 'red'; })],
    ['champ inconnu dans un carton', false, edit(l => { l.boxes[0]!['size'] = 2; })],
    ['champ inconnu dans position', false, edit(l => { (l.objects[0]!['position'] as Record<string, number>)['z'] = 0; })],
    ['champ inconnu dans scoring', false, edit(l => { l.scoring['oneStarMaxBuffered'] = 9; })],
    ['catégorie en nombre', false, edit(l => { l.categories[0]!['id'] = 3; })]
];

/**
 * Exceptions documentées : contrôles propres à validate.ts, qu'un JSON Schema ne sait pas exprimer. Le schéma les
 * accepte, le validateur les refuse. La même liste figure dans docs/specifications/regles.md (section « Versions »).
 */
const exceptions: [string, Json][] = [
    ['identifiant en double', edit(l => { l.objects[1]!['id'] = l.objects[0]!['id']; })],
    ['catégorie inconnue d’un objet', edit(l => { l.objects[0]!['category'] = 'inconnue'; })],
    ['bloqueur inconnu', edit(l => { l.objects[0]!['blockedBy'] = ['fantome']; })],
    ['objet qui se bloque lui-même', edit(l => { l.objects[0]!['blockedBy'] = [l.objects[0]!['id']]; })],
    ['cycle de blocage', edit(l => { const [a, b] = l.objects; a!['blockedBy'] = [b!['id']]; b!['blockedBy'] = [a!['id']]; })],
    ['quota : objets et capacité différents', edit(l => { l.boxes[0]!['capacity'] = Number(l.boxes[0]!['capacity']) + 1; })],
    ['part d’objets masqués hors difficulté', edit(l => { const o = l.objects.find(x => x['hidden'] !== true && (x['blockedBy'] as unknown[]).length > 0)!; o['hidden'] = true; })],
    ['plus de cartons actifs que de cartons', edit(l => { l.rules['activeBoxCount'] = l.boxes.length + 1; })],
    ['trois étoiles au-delà de deux étoiles', edit(l => { l.scoring['threeStarsMaxBuffered'] = Number(l.scoring['twoStarsMaxBuffered']) + 1; })]
];

describe('concordance du schéma publié et de validate.ts', () => {
    it.each(readdirSync('content/levels').filter(f => f.endsWith('.json')).sort())('%s : accepté des deux côtés', file => {
        const level: unknown = JSON.parse(readFileSync(`content/levels/${file}`, 'utf8'));
        expect(validatorAccepts(level)).toBe(true);
        expect(schemaAccepts(level), JSON.stringify(schemaAccepts.errors)).toBe(true);
    });

    it.each(cases)('%s : même verdict (accepté : %s)', (_name, expected, level) => {
        expect(validatorAccepts(level)).toBe(expected);
        expect(schemaAccepts(level), JSON.stringify(schemaAccepts.errors)).toBe(expected);
    });

    it.each(exceptions)('exception documentée, %s : refusé par validate.ts seulement', (_name, level) => {
        expect(validatorAccepts(level)).toBe(false);
        expect(schemaAccepts(level)).toBe(true);
    });

    it('la migration des formats 1.0 et 1.1 est propre à validate.ts : le schéma ne décrit que le format 1.2', () => {
        const historic: unknown = JSON.parse(readFileSync('tests/fixtures/levels/salon-format-1.1.json', 'utf8'));
        expect(validatorAccepts(historic)).toBe(true);
        expect(schemaAccepts(historic)).toBe(false);
    });

    it('aucun schéma publié pour les sauvegardes : leur forme est vérifiée par le stockage', () => {
        expect(readdirSync('packages/schemas').filter(f => f.endsWith('.schema.json'))).toEqual(['level.schema.json']);
    });
});
