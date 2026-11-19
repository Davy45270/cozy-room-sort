// Outil d'auteur des niveaux : node tools/author-levels.ts
// Chaque recette fixe la pièce, les cartons, le tampon, la forme de la disposition et la plage de difficulté
// visée (passages minimaux par le tampon). L'outil essaie des graines dans l'ordre et garde le premier tirage
// que le solveur résout dans cette plage. Déterministe : mêmes recettes ⇒ mêmes fichiers.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { withMode } from '@cozy-room-sort/engine';
import { validateLevel, type Box, type Level, type LevelObject } from '@cozy-room-sort/schemas';
import { solve } from '@cozy-room-sort/solver';

type Shape = 'piles' | 'etageres' | 'tas' | 'eparpille';
interface Recipe {
    file: string; room: string; name: string;
    /** Catégorie → capacités de ses cartons (un ou deux cartons par catégorie). */
    boxes: Readonly<Record<string, readonly number[]>>;
    buffer: number; active: number; shape: Shape; hidden: number;
    /** Plage visée de passages minimaux par le tampon. */
    target: readonly [number, number];
    difficulty: Level['difficulty'];
}

interface Category { id: string; label: string; objets: readonly string[] }
interface Theme { id: string; categories: readonly Category[] }

const themeFolder = new URL('../content/themes/', import.meta.url);
const themes = new Map(readdirSync(themeFolder).filter(file => file.endsWith('.json')).map(file => {
    const theme = JSON.parse(readFileSync(new URL(file, themeFolder), 'utf8')) as Theme;
    return [theme.id, new Map(theme.categories.map(category => [category.id, category]))];
}));

export const RECIPES: readonly Recipe[] = [
    { file: '001-salon', room: 'salon', name: 'Le salon en désordre', boxes: { livres: [3], coussins: [3], plantes: [3] }, buffer: 5, active: 1, shape: 'piles', hidden: 0, target: [0, 1], difficulty: 'easy' },
    { file: '002-salon', room: 'salon', name: 'Coussins partout', boxes: { livres: [4], coussins: [3], plantes: [3] }, buffer: 4, active: 1, shape: 'eparpille', hidden: 0, target: [1, 2], difficulty: 'easy' },
    { file: '003-salon', room: 'salon', name: 'La grande étagère', boxes: { livres: [3], coussins: [3], plantes: [3], cadres: [3] }, buffer: 4, active: 2, shape: 'etageres', hidden: 0.1, target: [1, 3], difficulty: 'easy' },
    { file: '004-salon', room: 'salon', name: 'Le tas du canapé', boxes: { livres: [2, 2], coussins: [3], plantes: [3], lumieres: [3] }, buffer: 4, active: 1, shape: 'tas', hidden: 0.15, target: [2, 4], difficulty: 'medium' },
    { file: '005-salon', room: 'salon', name: 'Après la fête', boxes: { livres: [3], coussins: [3], plantes: [3], cadres: [3], lumieres: [3] }, buffer: 5, active: 2, shape: 'piles', hidden: 0.2, target: [2, 5], difficulty: 'medium' },
    { file: '006-salon', room: 'salon', name: 'Tout sur les rayons', boxes: { livres: [2, 2], coussins: [4], plantes: [4], cadres: [4] }, buffer: 3, active: 1, shape: 'etageres', hidden: 0.2, target: [3, 6], difficulty: 'medium' },
    { file: '007-salon', room: 'salon', name: 'Le grand rangement du salon', boxes: { livres: [4], coussins: [2, 2], plantes: [3], cadres: [3], lumieres: [4] }, buffer: 4, active: 2, shape: 'tas', hidden: 0.25, target: [3, 7], difficulty: 'expert' },
    { file: '008-chambre', room: 'chambre', name: 'La chambre sens dessus dessous', boxes: { peluches: [3], coussins: [3], veilleuses: [3] }, buffer: 5, active: 1, shape: 'eparpille', hidden: 0, target: [0, 1], difficulty: 'easy' },
    { file: '009-chambre', room: 'chambre', name: 'Les piles de coussins', boxes: { peluches: [4], coussins: [4], livres: [3] }, buffer: 4, active: 1, shape: 'piles', hidden: 0.1, target: [1, 3], difficulty: 'easy' },
    { file: '010-chambre', room: 'chambre', name: 'Le tas de peluches', boxes: { peluches: [2, 2], coussins: [3], veilleuses: [2], livres: [3] }, buffer: 4, active: 2, shape: 'tas', hidden: 0.1, target: [1, 3], difficulty: 'easy' },
    { file: '011-chambre', room: 'chambre', name: 'Bibliothèque de chambre', boxes: { peluches: [3], coussins: [4], livres: [4], cadres: [3] }, buffer: 4, active: 1, shape: 'etageres', hidden: 0.15, target: [2, 5], difficulty: 'medium' },
    { file: '012-chambre', room: 'chambre', name: 'Un peu de tout', boxes: { peluches: [3], coussins: [3], livres: [3], veilleuses: [3], cadres: [3] }, buffer: 3, active: 1, shape: 'eparpille', hidden: 0.15, target: [2, 5], difficulty: 'medium' },
    { file: '013-chambre', room: 'chambre', name: 'Les tours de jouets', boxes: { peluches: [4], coussins: [2, 2], livres: [3], veilleuses: [3], cadres: [3] }, buffer: 4, active: 2, shape: 'piles', hidden: 0.2, target: [3, 6], difficulty: 'medium' },
    { file: '014-chambre', room: 'chambre', name: 'Le grand rangement de la chambre', boxes: { peluches: [2, 2], coussins: [4], livres: [4], veilleuses: [4], cadres: [4] }, buffer: 4, active: 2, shape: 'tas', hidden: 0.25, target: [3, 8], difficulty: 'expert' },
    { file: '015-salle-de-bain', room: 'salle-de-bain', name: 'La salle de bain après le bain', boxes: { serviettes: [3], accessoires: [3], flacons: [3] }, buffer: 5, active: 1, shape: 'etageres', hidden: 0, target: [0, 2], difficulty: 'easy' },
    { file: '016-salle-de-bain', room: 'salle-de-bain', name: 'La pile de serviettes', boxes: { serviettes: [4], accessoires: [4], flacons: [4] }, buffer: 4, active: 1, shape: 'tas', hidden: 0.1, target: [1, 3], difficulty: 'easy' },
    { file: '017-salle-de-bain', room: 'salle-de-bain', name: 'Les placards ouverts', boxes: { serviettes: [2, 2], accessoires: [3], flacons: [3], soins: [3] }, buffer: 4, active: 2, shape: 'piles', hidden: 0.15, target: [2, 4], difficulty: 'medium' },
    { file: '018-salle-de-bain', room: 'salle-de-bain', name: 'Autour du lavabo', boxes: { serviettes: [4], accessoires: [3], flacons: [3], parfums: [3], soins: [3] }, buffer: 3, active: 1, shape: 'eparpille', hidden: 0.15, target: [2, 5], difficulty: 'medium' },
    { file: '019-salle-de-bain', room: 'salle-de-bain', name: 'Les étagères de soins', boxes: { serviettes: [4], accessoires: [4], flacons: [2, 2], parfums: [3], soins: [3] }, buffer: 4, active: 1, shape: 'etageres', hidden: 0.2, target: [3, 6], difficulty: 'expert' },
    { file: '020-salle-de-bain', room: 'salle-de-bain', name: 'Le grand rangement de la salle de bain', boxes: { serviettes: [4], accessoires: [2, 2], flacons: [4], parfums: [4], soins: [4] }, buffer: 3, active: 2, shape: 'tas', hidden: 0.25, target: [3, 8], difficulty: 'expert' }
];

/** Générateur pseudo-aléatoire mulberry32 : seule source de hasard, graine écrite dans le niveau. */
function rng(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const shuffle = <T>(items: readonly T[], r: () => number): T[] => {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [a[i], a[j]] = [a[j] as T, a[i] as T];
    }
    return a;
};

interface Slot { x: number; y: number; depth: number; blockers: number[] }

/** Emplacements de la forme : la profondeur 0 est devant (accessible), un objet est bloqué par ceux posés devant lui. */
function layout(shape: Shape, n: number, r: () => number): Slot[] {
    const slots: Slot[] = [];
    if (shape === 'piles') {
        const columns = Math.max(3, Math.min(6, Math.round(n / 3)));
        const heights = Array.from({ length: columns }, () => 1);
        for (let k = columns; k < n; k++) heights[Math.floor(r() * columns)]!++;
        heights.forEach((h, col) => {
            for (let d = 0; d < h; d++) {
                slots.push({ x: (col + 0.5) / columns, y: 0.86 - d * 0.16, depth: d, blockers: d === 0 ? [] : [slots.length - 1] });
            }
        });
    } else if (shape === 'etageres') {
        const perRow = Math.max(3, Math.ceil(n / 3));
        for (let k = 0; k < n; k++) {
            const row = Math.floor(k / perRow);
            const i = k % perRow;
            const above = row === 0 ? [] : [k - perRow, k - perRow + 1].filter(j => j >= (row - 1) * perRow && j < row * perRow);
            slots.push({ x: (i + 0.5 + (row % 2) * 0.5) / (perRow + 0.5), y: 0.84 - row * 0.24, depth: row, blockers: above });
        }
    } else if (shape === 'tas') {
        // Tas en pyramide inversée vue de face : la rangée du dessus repose devant celle du dessous.
        let row = 0;
        let start = 0;
        let width = Math.max(2, Math.ceil(Math.sqrt(n * 1.6)));
        while (start < n) {
            const count = Math.min(width, n - start);
            for (let i = 0; i < count; i++) {
                const previousStart = start - (row === 0 ? 0 : width + 1);
                const above = row === 0 ? [] : [previousStart + i, previousStart + i + 1].filter(j => j >= previousStart && j < start && j >= 0);
                slots.push({ x: 0.5 + (i - (count - 1) / 2) * 0.15, y: 0.86 - row * 0.15, depth: row, blockers: above });
            }
            start += count;
            row++;
            width++;
        }
    } else {
        const columns = Math.ceil(Math.sqrt(n * 1.5));
        for (let k = 0; k < n; k++) {
            const blockers = k > 0 && r() < 0.35 ? [Math.floor(r() * k)] : [];
            slots.push({ x: ((k % columns) + 0.5) / columns, y: 0.25 + Math.floor(k / columns) * (0.6 / Math.ceil(n / columns)) + 0.1, depth: blockers.length, blockers });
        }
    }
    return slots;
}

function build(recipe: Recipe, seed: number): Level {
    const r = rng(seed);
    const categories = Object.keys(recipe.boxes);
    const theme = themes.get(recipe.room);
    const categoryData = new Map(categories.map(id => {
        const category = theme?.get(id);
        if (!category?.objets.length) throw new Error(`${recipe.room} : catégorie sans objets (${id})`);
        return [id, category];
    }));
    const boxList: Box[] = shuffle(categories.flatMap(cat => (recipe.boxes[cat] ?? []).map((capacity, j) => ({ id: `carton-${cat}-${j + 1}`, category: cat, capacity }))), r);
    const objectCategories = shuffle(categories.flatMap(cat => Array.from({ length: (recipe.boxes[cat] ?? []).reduce((a, b) => a + b, 0) }, () => cat)), r);
    const slots = layout(recipe.shape, objectCategories.length, r);
    const ids: string[] = [];
    const objects: LevelObject[] = objectCategories.map((cat, k) => {
        const assets = categoryData.get(cat)!.objets;
        const asset = assets[Math.floor(r() * assets.length)]!;
        const id = `objet-${k + 1}`;
        ids.push(id);
        const slot = slots[k] as Slot;
        const clamp = (v: number): number => Math.round(Math.min(0.94, Math.max(0.06, v)) * 1000) / 1000;
        const blockedBy = slot.blockers.map(b => ids[b] ?? '').filter(Boolean);
        return {
            id, category: cat, asset,
            position: { x: clamp(slot.x + (r() - 0.5) * 0.03), y: clamp(slot.y) },
            layer: 10 - slot.depth, blockedBy,
            ...(blockedBy.length > 0 && r() < recipe.hidden ? { hidden: true } : {})
        };
    });
    return {
        schemaVersion: '1.0', rulesVersion: '1', id: recipe.file, name: recipe.name, theme: recipe.room, difficulty: recipe.difficulty, seed,
        rules: { bufferCapacity: recipe.buffer, activeBoxCount: recipe.active, allowUndo: true, allowHints: true, timeLimitSeconds: null },
        categories: categories.map(id => ({ id, label: categoryData.get(id)!.label })),
        boxes: boxList, objects,
        scoring: { threeStarsMaxBuffered: 0, twoStarsMaxBuffered: 0 }
    };
}

export function author(recipe: Recipe, firstSeed: number): { level: Level; tries: number } {
    for (let tries = 1; tries <= 400; tries++) {
        const level = build(recipe, firstSeed + tries);
        const check = validateLevel(level);
        if (!check.ok) throw new Error(`${recipe.file} : ${check.errors.map(e => `${e.path} ${e.message}`).join(' ; ')}`);
        const result = solve(withMode(level, 'classique'));
        if (result.kind !== 'solved' || result.buffered < recipe.target[0] || result.buffered > recipe.target[1]) continue;
        return {
            tries,
            level: { ...level, scoring: { threeStarsMaxBuffered: result.buffered, twoStarsMaxBuffered: result.buffered + 2 },
                meta: { solution: result.trace, engineVersion: '0.1.0', statesExplored: result.statesExplored } }
        };
    }
    throw new Error(`${recipe.file} : aucun tirage dans la plage ${recipe.target.join('–')} en 400 essais`);
}

if (process.argv[1]?.endsWith('author-levels.ts')) {
    RECIPES.forEach((recipe, i) => {
        const { level, tries } = author(recipe, 42_000 + i * 1000);
        writeFileSync(`content/levels/${recipe.file}.json`, `${JSON.stringify(level, null, 2)}\n`);
        console.log(`${recipe.file} : ${level.objects.length} objets, ${level.scoring.threeStarsMaxBuffered} passage(s) au mieux, graine ${level.seed} (${tries} essai(s))`);
    });
}
