// Le catalogue embarqué par le build doit être celui que la CLI valide : le niveau migré au format courant, jamais le
// JSON brut. Un niveau au format 1.0 (seuils d'étoiles historiques, règles 1) passe par le plugin du catalogue de Vite.
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import type { Plugin } from 'vite';
import { starsFor } from '@cozy-room-sort/engine';
import { migrateLevel, type Level } from '@cozy-room-sort/schemas';
import config from '../../apps/web/vite.config.ts';
import { levelById } from '../../apps/web/src/content.ts';

it('le plugin du catalogue émet le niveau migré, pas le JSON brut', () => {
    const plugins = (config as { plugins: Plugin[] }).plugins.flat();
    const catalog = plugins.find(plugin => plugin.name === 'crs-playable-catalog');
    if (!catalog || typeof catalog.transform !== 'function') throw new Error('plugin du catalogue absent');
    const current = levelById('001-salon');
    if (!current) throw new Error('niveau absent');
    // Le même niveau au format 1.0 : seuils exprimés en coups (9 et 11), règles 1.
    const { rulesVersion: _rules, scoring: _scoring, ...rest } = current;
    const historic = { ...rest, schemaVersion: '1.0', scoring: { threeStarsMaxMoves: 9, twoStarsMaxMoves: 11 } };
    const id = fileURLToPath(new URL('../../content/levels/001-salon.json', import.meta.url));
    const emitted = JSON.parse((catalog.transform as (code: string, id: string) => string).call({}, JSON.stringify(historic), id)) as Level;
    const migrated = migrateLevel(historic) as Level;
    expect(emitted.schemaVersion).toBe(migrated.schemaVersion);
    expect(emitted.rulesVersion).toBe(migrated.rulesVersion);
    expect(emitted.scoring).toEqual(migrated.scoring);
    expect(starsFor(emitted, 0)).toBe(starsFor(migrated, 0));
});
