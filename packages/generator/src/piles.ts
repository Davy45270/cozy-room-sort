import type { LevelObject } from '@cozy-room-sort/schemas';
import { objectSize, positionForUsefulCenter, REFERENCE_ROOM, roomView } from '@cozy-room-sort/schemas/room-geometry';
import { boundsOf } from '../../../content/assets/object-bounds.ts';
import { shuffled } from './random.ts';

export type PileItem = Pick<LevelObject, 'id' | 'asset' | 'category'>;
type BlockedItem = PileItem & Pick<LevelObject, 'blockedBy'>;

// Places disponibles sur les meubles et sur le sol, du fond vers l’avant.
const COLUMNS = [-.224, 0, .224] as const;
const SURFACES: Readonly<Record<string, readonly number[]>> = {
    salon: [-.068, -.15, -.091, .15, .163, .184],
    chambre: [-.045, -.165, -.097, .173, .146, .19],
    'salle-de-bain': [-.077, -.108, -.031, .153, .147, .22]
};
const DEFAULT_SURFACES = [-.123, -.123, -.123, .137, .137, .137];

export function makePiles(groups: readonly (readonly PileItem[])[], activeBoxes: number,
    maxEarly: number, random: () => number): BlockedItem[][] {
    const available = groups.map(group => [...group]);
    const piles: PileItem[][] = Array.from({ length: Math.min(groups.length, DEFAULT_SURFACES.length) }, () => []);
    for (const [i, group] of available.entries()) {
        const upcoming = available[i + activeBoxes];
        // Les pièces avancées recouvrent le carton courant et imposent parfois un passage au tampon.
        // Chaque carton garde au moins une pièce dans son propre lot.
        const early = upcoming ? Math.floor(random() * (Math.min(maxEarly, upcoming.length - 1) + 1)) : 0;
        const prefix = upcoming?.splice(upcoming.length - early, early) ?? [];
        piles[i % piles.length]!.push(...prefix, ...group);
    }
    // Chaque objet dépend de tous les objets qui le recouvrent dans la pile.
    return piles.map(pile => pile.map((item, depth) => ({
        ...item, blockedBy: pile.slice(0, depth).map(({ id }) => id)
    })));
}

export function placePiles(piles: readonly (readonly BlockedItem[])[], count: number,
    theme: string, random: () => number): LevelObject[] {
    const view = roomView(REFERENCE_ROOM);
    const size = objectSize(count, view);
    const heights = SURFACES[theme] ?? DEFAULT_SURFACES;
    const sites = shuffled(heights.map((y, i) => ({ x: COLUMNS[i % COLUMNS.length]!, y })), random);
    const coordinate = (value: number): number => Math.round(value * 1000) / 1000;
    return piles.flatMap((pile, i) => {
        const site = sites[i]!;
        const direction = random() < .5 ? -1 : 1;
        return pile.map(item => {
            // Le nombre de recouvreurs détermine la couche et le décalage dans l’éventail.
            const depth = item.blockedBy.length;
            const fan = pile.length === 1 ? 0 : .5 - depth / (pile.length - 1);
            const bounds = boundsOf(item.asset);
            if (!bounds) throw new Error(`boîte utile absente pour ${item.asset}`);
            const position = positionForUsefulCenter(
                view.x + (site.x + direction * fan * .024) * view.size,
                view.y + (site.y + fan * .054) * view.size,
                size, bounds, view
            );
            return {
                ...item,
                position: { x: coordinate(position.x), y: coordinate(position.y) },
                layer: pile.length - depth
            };
        });
    });
}
