export const SCHEMA_VERSION = '1.1';

export const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

function migrateScoring(raw: Record<string, unknown>): unknown {
    const scoring = raw['scoring'];
    const boxes = raw['boxes'];
    if (!isObject(scoring) || !Array.isArray(boxes)) return scoring;
    const three = scoring['threeStarsMaxMoves'];
    const two = scoring['twoStarsMaxMoves'];
    if (scoring['threeStarsMaxBuffered'] !== undefined || scoring['twoStarsMaxBuffered'] !== undefined
        || typeof three !== 'number' || typeof two !== 'number') return scoring;

    let quota = 0;
    for (const box of boxes) {
        if (!isObject(box) || typeof box['capacity'] !== 'number' || !Number.isSafeInteger(box['capacity']) || box['capacity'] < 1) return scoring;
        quota += box['capacity'];
    }
    // Une victoire impose une sélection par objet. L'ancien seuil au-delà de ce quota devient une marge de tampon.
    return { threeStarsMaxBuffered: three - quota, twoStarsMaxBuffered: two - quota };
}

export function migrateLevel(raw: unknown): unknown {
    if (!isObject(raw) || raw['schemaVersion'] !== '1.0') return raw;
    return {
        ...raw,
        schemaVersion: SCHEMA_VERSION,
        rulesVersion: raw['rulesVersion'] === undefined ? '1' : raw['rulesVersion'],
        scoring: migrateScoring(raw)
    };
}
