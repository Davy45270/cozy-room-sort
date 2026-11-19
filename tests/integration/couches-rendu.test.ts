// Architecture en couches : écrans, adaptateur Phaser, et paquets purs sans rendu ni DOM.
// Contrôle statique des imports, en complément de la règle oxlint de engine-purity.test.ts.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

function files(folder: string): string[] {
    return readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
        const path = join(folder, entry.name);
        return entry.isDirectory() ? files(path) : /\.[cm]?[jt]sx?$/.test(entry.name) ? [path] : [];
    });
}

const read = (file: string): string => readFileSync(file, 'utf8');
const sceneFolder = 'apps/web/src/scene/';
const pureFolders = ['packages/schemas/src', 'packages/engine/src', 'packages/solver/src', 'packages/generator/src'];

/** Modules importés à l'exécution, imports et réexports de types exclus. */
function runtimeImports(source: string): string[] {
    const found: string[] = [];
    for (const [, kind, module] of source.matchAll(/^\s*(?:import|export)\s+(type\s+)?[^'"]*?\bfrom\s+['"]([^'"]+)['"]/gm)) {
        if (!kind && module) found.push(module);
    }
    for (const [, module] of source.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm)) if (module) found.push(module);
    for (const [, module] of source.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) if (module) found.push(module);
    return found;
}

/** Tous les modules cités, imports de types compris. */
const anyImports = (source: string): string[] =>
    [...source.matchAll(/(?:\bfrom\s+|^\s*import\s+|\bimport\(\s*)['"]([^'"]+)['"]/gm)].map(([, module]) => module ?? '');

it('le relevé des imports distingue les types, les imports nus et les imports dynamiques', () => {
    expect(runtimeImports("import type Phaser from 'phaser';\nimport type { A } from 'x';")).toEqual([]);
    expect(runtimeImports("import Phaser from 'phaser';")).toEqual(['phaser']);
    expect(runtimeImports("import { a,\n  type B } from 'y';\nimport 'z';\nconst m = await import('w');")).toEqual(['y', 'z', 'w']);
    expect(runtimeImports("export { a } from 'v';\nexport type { T } from 'u';")).toEqual(['v']);
});

it('seuls les fichiers de l’adaptateur Phaser importent phaser à l’exécution ; les écrans n’en citent que les types', () => {
    const web = files('apps/web/src');
    const runtime = web.filter(file => runtimeImports(read(file)).some(module => module === 'phaser' || module.startsWith('phaser/')));
    expect(runtime.length).toBeGreaterThan(0);
    expect(runtime.filter(file => !file.startsWith(sceneFolder))).toEqual([]);
    // Les écrans existent, à part de la scène, et ne chargent pas Phaser eux-mêmes.
    const screens = files('apps/web/src/screens');
    expect(screens.length).toBeGreaterThan(0);
    expect(screens.filter(file => runtimeImports(read(file)).includes('phaser'))).toEqual([]);
});

it('l’adaptateur Phaser ne porte aucune règle métier : ni moteur, ni solveur, ni générateur à l’exécution', () => {
    const scene = files(sceneFolder);
    expect(scene.length).toBeGreaterThan(0);
    const rules = /^@cozy-room-sort\/(?:engine|solver|generator)(?:\/|$)|\/packages\/(?:engine|solver|generator)\//;
    expect(scene.flatMap(file => runtimeImports(read(file)).filter(module => rules.test(module)).map(module => `${file} : ${module}`))).toEqual([]);
    // Aucune transition d'état n'est calculée dans la scène : elle passe par le contrôleur.
    expect(scene.filter(file => /\bapplyAction\b/.test(read(file)))).toEqual([]);
    expect(read('AGENTS.md')).toContain('Pas de règle métier dans le rendu.');
});

it('le moteur, le solveur, le générateur et les schémas n’importent ni phaser ni le DOM', () => {
    const offenders = pureFolders.flatMap(files).flatMap(file => {
        const source = read(file);
        const phaser = anyImports(source).filter(module => module === 'phaser' || module.startsWith('phaser/'));
        const dom = [...source.matchAll(/\b(?:window|document|navigator|localStorage|indexedDB|HTMLElement|requestAnimationFrame)\b/g)].map(([name]) => name);
        return [...phaser, ...dom].map(name => `${file} : ${name}`);
    });
    expect(offenders).toEqual([]);
});
