import type { SavedGame } from '@cozy-room-sort/engine';
import type { Level } from '@cozy-room-sort/schemas';

export type ReadableSave = SavedGame & { levelSignature?: string };
export type SignedSave = SavedGame & { levelSignature: string };

/** Empreinte du contenu utilisé pour rejouer et noter la trace, après application du mode. */
export function signatureOf(level: Level): string {
    const { rules, scoring } = level;
    // Les listes ordonnées du moteur restent dans l'ordre du niveau.
    const content = JSON.stringify([
        level.rulesVersion,
        [rules.bufferCapacity, rules.activeBoxCount, rules.allowUndo, rules.allowHints, rules.timeLimitSeconds,
            rules.undoLimit ?? 200, String(rules.hintLimit ?? Infinity)],
        level.boxes.map(box => [box.id, box.category, box.capacity]),
        level.objects.map(object => [object.id, object.category, [...object.blockedBy].sort()]),
        [scoring.threeStarsMaxBuffered, scoring.twoStarsMaxBuffered]
    ]);
    let hash = 0xcbf29ce484222325n;
    for (const byte of new TextEncoder().encode(content)) {
        hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 0x100000001b3n);
    }
    return hash.toString(16).padStart(16, '0');
}
