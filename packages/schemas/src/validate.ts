// Validateur écrit à la main : aucune dépendance d'exécution. Il cumule toutes les erreurs et ne lève jamais.
import type { Level, LevelError, ValidationResult } from './level.ts';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

export function parseLevel(text: string): ValidationResult {
    let data: unknown;
    try {
        data = JSON.parse(text);
    } catch (error) {
        return { ok: false, errors: [{ path: '$', message: `JSON illisible : ${error instanceof Error ? error.message : String(error)}` }] };
    }
    return validateLevel(data);
}

export function validateLevel(input: unknown): ValidationResult {
    const errors: LevelError[] = [];
    const err = (path: string, message: string): void => { errors.push({ path, message }); };
    if (!isObj(input)) return { ok: false, errors: [{ path: '$', message: 'le niveau doit être un objet JSON' }] };

    if (input['schemaVersion'] !== '1.0') err('schemaVersion', 'version de schéma attendue : "1.0"');
    if (input['rulesVersion'] !== '1') err('rulesVersion', 'version des règles attendue : "1"');
    for (const key of ['id', 'name', 'theme']) if (!isStr(input[key])) err(key, 'texte non vide attendu');
    if (!['easy', 'medium', 'expert'].includes(input['difficulty'] as string)) err('difficulty', 'attendu : easy, medium ou expert');
    if (!isInt(input['seed'])) err('seed', 'entier attendu');

    const categories = Array.isArray(input['categories']) ? input['categories'] as unknown[] : (err('categories', 'liste attendue'), []);
    const boxes = Array.isArray(input['boxes']) ? input['boxes'] as unknown[] : (err('boxes', 'liste attendue'), []);
    const objects = Array.isArray(input['objects']) ? input['objects'] as unknown[] : (err('objects', 'liste attendue'), []);

    const ids = new Set<string>();
    const unique = (path: string, id: unknown): void => {
        if (!isStr(id)) { err(path, 'identifiant non vide attendu'); return; }
        if (ids.has(id)) err(path, `identifiant « ${id} » déjà utilisé`);
        ids.add(id);
    };
    const categoryIds = new Set<string>();
    categories.forEach((c, i) => {
        if (!isObj(c)) { err(`categories[${i}]`, 'objet attendu'); return; }
        unique(`categories[${i}].id`, c['id']);
        if (isStr(c['id'])) categoryIds.add(c['id']);
        if (!isStr(c['label'])) err(`categories[${i}].label`, 'texte non vide attendu');
    });
    const knownCategory = (path: string, category: unknown): void => {
        if (!isStr(category) || !categoryIds.has(category)) err(path, `catégorie inconnue : ${String(category)}`);
    };

    const capacityByCategory = new Map<string, number>();
    boxes.forEach((b, i) => {
        if (!isObj(b)) { err(`boxes[${i}]`, 'objet attendu'); return; }
        unique(`boxes[${i}].id`, b['id']);
        knownCategory(`boxes[${i}].category`, b['category']);
        if (!isInt(b['capacity']) || b['capacity'] < 1) err(`boxes[${i}].capacity`, 'entier ≥ 1 attendu');
        else if (isStr(b['category'])) capacityByCategory.set(b['category'], (capacityByCategory.get(b['category']) ?? 0) + b['capacity']);
    });
    if (boxes.length === 0) err('boxes', 'au moins un carton');

    const objectIds = new Set<string>();
    const countByCategory = new Map<string, number>();
    const blockers = new Map<string, readonly string[]>();
    objects.forEach((o, i) => {
        if (!isObj(o)) { err(`objects[${i}]`, 'objet attendu'); return; }
        unique(`objects[${i}].id`, o['id']);
        if (isStr(o['id'])) objectIds.add(o['id']);
        knownCategory(`objects[${i}].category`, o['category']);
        if (isStr(o['category'])) countByCategory.set(o['category'], (countByCategory.get(o['category']) ?? 0) + 1);
        if (!isStr(o['asset'])) err(`objects[${i}].asset`, 'texte non vide attendu');
        if (!isInt(o['layer'])) err(`objects[${i}].layer`, 'entier attendu');
        if (o['hidden'] !== undefined && typeof o['hidden'] !== 'boolean') err(`objects[${i}].hidden`, 'booléen attendu');
        const position = o['position'];
        if (!isObj(position)) err(`objects[${i}].position`, 'objet { x, y } attendu');
        else for (const axis of ['x', 'y']) {
            const v = position[axis];
            if (!isNum(v) || v < 0 || v > 1) err(`objects[${i}].position.${axis}`, 'nombre entre 0 et 1 attendu');
        }
        if (!Array.isArray(o['blockedBy'])) err(`objects[${i}].blockedBy`, 'liste attendue');
        else if (isStr(o['id'])) blockers.set(o['id'], (o['blockedBy'] as unknown[]).filter(isStr));
    });
    objects.forEach((o, i) => {
        if (!isObj(o) || !Array.isArray(o['blockedBy'])) return;
        (o['blockedBy'] as unknown[]).forEach((b, j) => {
            if (!isStr(b) || !objectIds.has(b)) err(`objects[${i}].blockedBy[${j}]`, `objet bloquant inconnu : ${String(b)}`);
            else if (b === o['id']) err(`objects[${i}].blockedBy[${j}]`, 'un objet ne peut pas se bloquer lui-même');
        });
    });
    const cycle = findCycle(blockers);
    if (cycle) err('objects', `cycle de blocage : ${cycle.join(' → ')}`);

    categories.forEach((c, i) => {
        if (!isObj(c) || !isStr(c['id'])) return;
        const count = countByCategory.get(c['id']) ?? 0;
        const capacity = capacityByCategory.get(c['id']) ?? 0;
        if (count !== capacity) err(`categories[${i}]`, `${count} objets « ${c['id']} » pour une capacité ${capacity} de cartons`);
    });

    const rules = input['rules'];
    if (!isObj(rules)) err('rules', 'objet attendu');
    else {
        const buffer = rules['bufferCapacity'];
        if (!isInt(buffer) || buffer < 1 || buffer > 8) err('rules.bufferCapacity', 'entier entre 1 et 8 attendu');
        const active = rules['activeBoxCount'];
        if (!isInt(active) || active < 1 || active > boxes.length) err('rules.activeBoxCount', `entier entre 1 et ${boxes.length} attendu`);
        for (const key of ['allowUndo', 'allowHints']) if (typeof rules[key] !== 'boolean') err(`rules.${key}`, 'booléen attendu');
        const limit = rules['timeLimitSeconds'];
        if (limit !== null && (!isNum(limit) || limit <= 0)) err('rules.timeLimitSeconds', 'null ou nombre > 0 attendu');
        for (const key of ['undoLimit', 'hintLimit']) {
            const v = rules[key];
            if (v !== undefined && (typeof v !== 'number' || Number.isNaN(v) || v < 0)) err(`rules.${key}`, 'nombre ≥ 0 attendu');
        }
    }

    const scoring = input['scoring'];
    if (!isObj(scoring)) err('scoring', 'objet attendu');
    else {
        const three = scoring['threeStarsMaxBuffered'];
        const two = scoring['twoStarsMaxBuffered'];
        if (!isInt(three) || three < 0) err('scoring.threeStarsMaxBuffered', 'entier ≥ 0 attendu');
        if (!isInt(two) || two < 0) err('scoring.twoStarsMaxBuffered', 'entier ≥ 0 attendu');
        if (isInt(three) && isInt(two) && three > two) err('scoring', 'le seuil trois étoiles doit être ≤ au seuil deux étoiles');
    }

    const meta = input['meta'];
    if (meta !== undefined) {
        if (!isObj(meta)) err('meta', 'objet attendu');
        else if (meta['solution'] !== undefined && !(Array.isArray(meta['solution']) && meta['solution'].every(isStr))) err('meta.solution', 'liste d\'identifiants attendue');
    }

    return errors.length === 0 ? { ok: true, level: input as unknown as Level } : { ok: false, errors };
}

/** Parcours en profondeur à trois couleurs ; rend le cycle trouvé, premier sommet répété à la fin. */
function findCycle(edges: ReadonlyMap<string, readonly string[]>): string[] | null {
    const state = new Map<string, 1 | 2>();
    const stack: string[] = [];
    const visit = (node: string): string[] | null => {
        state.set(node, 1);
        stack.push(node);
        for (const next of edges.get(node) ?? []) {
            if (!edges.has(next)) continue;
            const s = state.get(next);
            if (s === 1) return [...stack.slice(stack.indexOf(next)), next];
            if (s === undefined) {
                const found = visit(next);
                if (found) return found;
            }
        }
        stack.pop();
        state.set(node, 2);
        return null;
    };
    for (const node of edges.keys()) {
        if (state.has(node)) continue;
        const found = visit(node);
        if (found) return found;
    }
    return null;
}
