export const SCHEMA_VERSION = '1.2';
/** Version des règles du moteur. 2 : sans coup légal, la partie n'est bloquée que si une annulation reste disponible. */
export const RULES_VERSION = '2';

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

/**
 * Migre un document vers le format courant, puis vers la version courante des règles : le contenu d'un niveau écrit pour
 * les règles 1 se joue sous les règles 2 (seule la fin de partie sans annulation disponible change). Les journaux de
 * partie, eux, portent la version des règles dans leur empreinte : ceux des règles 1 reprennent au début.
 */
export function migrateLevel(raw: unknown): unknown {
    const formatted = migrateFormat(raw);
    if (!isObject(formatted) || formatted['rulesVersion'] !== '1') return formatted;
    return { ...formatted, rulesVersion: RULES_VERSION };
}

function migrateFormat(raw: unknown): unknown {
    if (!isObject(raw)) return raw;
    if (raw['schemaVersion'] === '1.1') return { ...raw, schemaVersion: SCHEMA_VERSION };
    if (raw['schemaVersion'] !== '1.0') return raw;
    return {
        ...raw,
        schemaVersion: SCHEMA_VERSION,
        rulesVersion: raw['rulesVersion'] === undefined ? '1' : raw['rulesVersion'],
        scoring: migrateScoring(raw)
    };
}
