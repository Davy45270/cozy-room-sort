import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

function files(folder: string): string[] {
    return readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
        const path = join(folder, entry.name);
        return entry.isDirectory() ? files(path) : [path];
    });
}

const contentFiles = files('content');
const contentJson = contentFiles.filter(path => path.endsWith('.json'));
const interfaceFiles = [...files('apps/web/src'), 'apps/web/index.html'];
const read = (file: string): string => readFileSync(file, 'utf8');

it('garde l’interface et le contenu sans URL externe', () => {
    const paths = [...interfaceFiles, ...contentJson, ...contentFiles.filter(path => !/\.(?:json|webp|png|jpe?g|ico|woff2?)$/i.test(path))];
    const violations = paths.flatMap(path => [...read(path).matchAll(/https?:\/\/[^\s"'<>\\)`]+/gi)]
        .filter(([url]) => {
            try { return !['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname); }
            catch { return true; }
        }).map(([url]) => `${path} : ${url}`));
    expect(violations).toEqual([]);
});

it('garde l’interface sans compte, connexion, publicité ni énergie', () => {
    const restricted = /(?<![\p{L}\p{N}])(?:account|login|log-in|sign-in|signup|sign-up|oauth|advertising|advertisement|ads|adsense|ad-banner|energy|compte|connexion|inscription|publicit[ée]|[ée]nergie)(?![\p{L}\p{N}])/iu;
    const normalize = (source: string): string => source.replace(/(?<=[\p{Ll}\d])(?=\p{Lu})/gu, ' ');
    expect(interfaceFiles.filter(path => restricted.test(normalize(path)) || restricted.test(normalize(read(path))))).toEqual([]);
});

it('utilise les paquets locaux ou leurs versions de registre et aucun sous-module', () => {
    const manifests = ['package.json', ...['packages', 'apps'].flatMap(folder => readdirSync(folder)
        .map(name => join(folder, name, 'package.json')).filter(existsSync))];
    const violations = manifests.flatMap(path => {
        const manifest = JSON.parse(read(path)) as Record<string, Record<string, string> | undefined>;
        return ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'].flatMap(key =>
            Object.entries(manifest[key] ?? {})
                .filter(([, version]) => /[:/\\]/.test(version)
                    && !/^npm:(?:@[\w.-]+\/)?[\w.-]+(?:@[^:/\\]+)?$/.test(version)
                    && !/^workspace:[^:/\\]+$/.test(version))
                .map(([name, version]) => `${path} : ${name} ${version}`));
    });
    const lock = JSON.parse(read('package-lock.json')) as { packages: Record<string, { resolved?: string; link?: boolean }> };
    const unexpectedSources = Object.entries(lock.packages).filter(([, entry]) => {
        if (!entry.resolved) return false;
        if (entry.link) return !manifests.includes(join(entry.resolved, 'package.json'));
        return !entry.resolved.startsWith('https://registry.npmjs.org/');
    }).map(([name]) => name);
    expect(unexpectedSources).toEqual([]);
    expect(violations).toEqual([]);
    expect(existsSync('.gitmodules')).toBe(false);
});

it('compile en TypeScript strict', () => {
    expect(JSON.parse(read('tsconfig.json'))).toMatchObject({ compilerOptions: { strict: true } });
});

it('le monorepo contient les applications, paquets, contenus, outils, tests et guides du MVP', () => {
    const paths = [
        'apps/web', 'packages/schemas', 'packages/engine', 'packages/solver', 'packages/generator', 'packages/level-tools',
        'content/levels', 'content/themes', 'content/assets', 'tools/validate-levels.ts', 'tools/generate-levels.ts',
        'tools/benchmark-solver.ts', 'tests/unit', 'tests/property', 'tests/integration', 'tests/e2e',
        'docs/architecture', 'docs/specifications', 'docs/ai-agents/README.md',
        'AGENTS.md', 'README.md', 'CONTRIBUTING.md', 'LICENSE', '.woodpecker/checks.yml', '.woodpecker/e2e.yml'
    ];
    expect(paths.filter(path => !existsSync(path))).toEqual([]);
});
