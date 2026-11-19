import enginePackage from '../../engine/package.json' with { type: 'json' };
import { DIFFICULTIES, SCHEMA_VERSION, isDifficulty, validateLevel, type Difficulty, type Level, type LevelObject } from '@cozy-room-sort/schemas';
import { measureDecisions, replayTrace, solve } from '@cozy-room-sort/solver';
import { seededRandom, shuffled } from './random.ts';
import { findTheme } from './themes.ts';

export { findTheme } from './themes.ts';

export interface GenerationRequest {
    theme: string;
    difficulty: Difficulty;
    seed: number;
    index: number;
}

interface GenerationOptions {
    attempts?: number;
    /** Crochet de test pour injecter un candidat avant la validation. */
    candidate?: (level: Level) => Level;
    maxStates?: number;
}

type Draft = Omit<LevelObject, 'position' | 'layer' | 'blockedBy'> & { blockedBy: string[] };

function build(request: GenerationRequest, random: () => number): Level {
    const theme = findTheme(request.theme);
    const { difficulty, seed, index } = request;
    const thresholds = DIFFICULTIES[difficulty];
    const [minCategories, maxCategories] = thresholds.categories;
    const available = theme.categories.filter(category => category.objets.length > 0);
    if (available.length < minCategories) {
        throw new Error(`${theme.label} : ${available.length} catégories disponibles, ${minCategories} requises pour ${difficulty}`);
    }
    const integer = (min: number, max: number): number => min + Math.floor(random() * (max - min + 1));
    const categories = shuffled(available, random).slice(0, integer(minCategories, Math.min(maxCategories, available.length)));
    const count = integer(...thresholds.objects);
    const activeBoxCount = integer(1, 2);

    // Répartit les objets avant de fixer les quotas. Les familles sont équilibrées mais de tailles variables.
    const groups = categories.map((): Draft[] => []);
    const order = Array.from({ length: count }, (_, i) => i % categories.length);
    for (let i = categories.length * 2; i < count; i++) {
        if (random() < 0.25) order[i] = integer(0, categories.length - 1);
    }
    order.forEach((group, i) => {
        const category = categories[group]!;
        const asset = category.objets[integer(0, category.objets.length - 1)]!;
        groups[group]!.push({ id: `objet-${seed}-${i + 1}`, category: category.id, asset, blockedBy: [] });
    });
    const boxes = groups.map((group, i) => ({ id: `carton-${i + 1}`, category: group[0]!.category, capacity: group.length }));
    const gates = groups.map(group => group.at(-1)!);

    // Chaque carton a une dernière pièce. Certains objets d'un carton futur sont accessibles en avance.
    // Les passages imposés bloquent cette dernière pièce, les choix facultatifs peuvent saturer le tampon.
    groups.forEach((group, i) => {
        const previous = gates[i - 1];
        if (previous) for (const object of group) object.blockedBy.push(previous.id);
        const width = integer(2, 3);
        for (let j = width; j < group.length - 1; j++) {
            const start = (Math.floor(j / width) - 1) * width;
            group[j]!.blockedBy.push(...group.slice(start, start + width).map(object => object.id));
        }
        gates[i]!.blockedBy.push(...group.slice(0, -1).map(object => object.id));
    });
    groups.forEach((_group, i) => {
        const upcoming = groups[i + activeBoxCount];
        if (!upcoming) return;
        const forced = integer(0, Math.min(upcoming.length - 1, thresholds.bufferCapacity, difficulty === 'easy' ? 1 : 3));
        const earliest = shuffled(upcoming.slice(0, -1), random);
        const exposed = integer(forced, Math.min(earliest.length, thresholds.bufferCapacity + 1));
        const early = earliest.slice(0, exposed);
        for (const [j, object] of early.entries()) {
            object.blockedBy = i === 0 ? [] : [gates[i - 1]!.id];
            if (j < forced) gates[i]!.blockedBy.push(object.id);
        }
    });

    const drafts = groups.flat();
    const [minHidden, maxHidden] = thresholds.hiddenPercent;
    const maskCount = integer(Math.ceil(count * minHidden / 100), Math.floor(count * maxHidden / 100));
    const hidden = new Set(shuffled(drafts.filter(object => object.blockedBy.length > 0), random).slice(0, maskCount));
    const columns = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / columns);
    const flip = random() < 0.5;
    const coordinate = (value: number): number => Math.round(value * 1000) / 1000;
    const objects = drafts.map((object, i): LevelObject => {
        const row = Math.floor(i / columns);
        const column = (row % 2 === 0) === flip ? i % columns : columns - 1 - i % columns;
        return {
            ...object,
            position: { x: coordinate((column + 0.5) / columns), y: coordinate((row + 0.5) / rows) },
            layer: count - i,
            ...(hidden.has(object) ? { hidden: true } : {})
        };
    });

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
