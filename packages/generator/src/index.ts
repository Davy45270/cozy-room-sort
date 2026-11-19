import enginePackage from '../../engine/package.json' with { type: 'json' };
import { DIFFICULTIES, SCHEMA_VERSION, isDifficulty, validateLevel, type Difficulty, type Level } from '@cozy-room-sort/schemas';
import { measureDecisions, replayTrace, solve } from '@cozy-room-sort/solver';
import { seededRandom, shuffled } from './random.ts';
import { boundsOf } from '../../../content/assets/object-bounds.ts';
import { roomGeometryError } from '@cozy-room-sort/schemas/room-geometry';
import { makePiles, placePiles, type PileItem } from './piles.ts';
import { findTheme } from './themes.ts';

export { findTheme } from './themes.ts';

export interface GenerationRequest {
    theme: string;
    difficulty: Difficulty;
    seed: number;
    index: number;
    /** Fixe l’effectif lors d’une réédition du catalogue. */
    objectCount?: number;
}

interface GenerationOptions {
    attempts?: number;
    /** Crochet de test pour injecter un candidat avant la validation. */
    candidate?: (level: Level) => Level;
    maxStates?: number;
}

function build(request: GenerationRequest, random: () => number): Level {
    const theme = findTheme(request.theme);
    const { difficulty, seed, index } = request;
    const thresholds = DIFFICULTIES[difficulty];
    const [minCategories, maxCategories] = thresholds.categories;
    const available = theme.categories.filter(category => category.objets.length > 0
        && (difficulty === 'expert' || !category.expertSeulement));
    if (available.length < minCategories) {
        throw new Error(`${theme.label} : ${available.length} catégories disponibles, ${minCategories} requises pour ${difficulty}`);
    }
    const integer = (min: number, max: number): number => min + Math.floor(random() * (max - min + 1));
    const categories = shuffled(available, random).slice(0, integer(minCategories, Math.min(maxCategories, available.length)));
    const count = request.objectCount ?? integer(...thresholds.objects);
    const activeBoxCount = integer(1, 2);

    // Répartit les objets avant de fixer les quotas. Les familles sont équilibrées mais de tailles variables.
    const groups = categories.map((): PileItem[] => []);
    const order = Array.from({ length: count }, (_, i) => i % categories.length);
    for (let i = categories.length * 2; i < count; i++) {
        if (random() < 0.25) order[i] = integer(0, categories.length - 1);
    }
    order.forEach((group, i) => {
        const category = categories[group]!;
        const asset = category.objets[integer(0, category.objets.length - 1)]!;
        groups[group]!.push({ id: `pile-${i + 1}`, category: category.id, asset });
    });
    const boxes = groups.map((group, i) => ({ id: `carton-${i + 1}`, category: group[0]!.category, capacity: group.length }));
    const maxEarly = difficulty === 'easy' ? 1 : 2;
    const piles = makePiles(groups, activeBoxCount, maxEarly, random);
    const placed = placePiles(piles, count, theme.id, random);
    const [minHidden, maxHidden] = thresholds.hiddenPercent;
    const maskCount = integer(Math.ceil(count * minHidden / 100), Math.floor(count * maxHidden / 100));
    const hidden = new Set(shuffled(placed.filter(object => object.blockedBy.length > 0), random).slice(0, maskCount));
    const objects = placed.map(object => hidden.has(object) ? { ...object, hidden: true } : object);

    return {
        schemaVersion: SCHEMA_VERSION, rulesVersion: '1',
        id: `${String(index).padStart(3, '0')}-${theme.id}`,
        name: `${theme.label} · ${index}`, theme: theme.id, difficulty, seed,
        rules: { bufferCapacity: thresholds.bufferCapacity, activeBoxCount, allowUndo: true, allowHints: true, timeLimitSeconds: null },
        categories: categories.map(({ id, label }) => ({ id, label })),
        boxes, objects,
        scoring: { threeStarsMaxBuffered: 0, twoStarsMaxBuffered: 0 }
    };
}

export function generateLevel(request: GenerationRequest, options: GenerationOptions = {}): Level {
    if (!isDifficulty(request.difficulty)) throw new Error('difficulté attendue : easy, medium ou expert');
    if (!Number.isSafeInteger(request.seed)) throw new Error('la graine doit être un entier sûr');
    if (!Number.isSafeInteger(request.index) || request.index < 1) throw new Error('l’indice doit être un entier positif');
    const [min, max] = DIFFICULTIES[request.difficulty].objects;
    const count = request.objectCount;
    if (count !== undefined && (!Number.isInteger(count) || count < min || count > max)) {
        throw new Error(`effectif attendu entre ${min} et ${max}`);
    }
    const random = seededRandom(request.seed);
    const attempts = options.attempts ?? 24;
    let reason = 'aucun candidat';
    for (let attempt = 0; attempt < attempts; attempt++) {
        const draft = build(request, random);
        const validated = validateLevel(options.candidate?.(draft) ?? draft);
        if (!validated.ok) {
            reason = validated.errors.map(({ path, message }) => `${path} : ${message}`).join(' ; ');
            continue;
        }
        const level = validated.level;
        const geometry = roomGeometryError(level, boundsOf);
        if (geometry) {
            reason = geometry;
            continue;
        }
        const result = solve(level, options.maxStates === undefined ? {} : { maxStates: options.maxStates });
        if (result.kind !== 'solved') {
            reason = result.kind;
            continue;
        }
        if (replayTrace(level, result.trace) !== 'won') {
            reason = 'trace sans victoire';
            continue;
        }
        const metrics = measureDecisions(level);
        if (!metrics) {
            reason = 'unverified (mesure de difficulté)';
            continue;
        }
        return {
            ...level,
            scoring: { threeStarsMaxBuffered: result.buffered, twoStarsMaxBuffered: result.buffered + 2 },
            meta: { solution: result.trace, engineVersion: enginePackage.version, statesExplored: result.statesExplored, ...metrics }
        };
    }
    throw new Error(`${request.theme} · ${request.difficulty} · graine ${request.seed} : ${reason} après ${attempts} essai(s)`);
}
