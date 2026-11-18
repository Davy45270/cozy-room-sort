// npm run level:solve -- <fichier> [--write] : affiche la solution la plus courte ; --write l'enregistre dans meta.
import { readFileSync, writeFileSync } from 'node:fs';
import { withMode } from '@cozy-room-sort/engine';
import { parseLevel } from '@cozy-room-sort/schemas';
import { solve } from '@cozy-room-sort/solver';

const args = process.argv.slice(2);
const path = args.find(a => !a.startsWith('--'));
if (path === undefined) {
    console.error('usage : level:solve <fichier> [--write]');
    process.exit(2);
}
const parsed = parseLevel(readFileSync(path, 'utf8'));
if (!parsed.ok) {
    for (const e of parsed.errors) console.log(`ÉCHEC ${e.path} : ${e.message}`);
    process.exit(1);
}
const result = solve(withMode(parsed.level, 'classique'));
if (result.kind !== 'solved') {
    console.log(`ÉCHEC ${parsed.level.id} : ${result.kind === 'unsolvable' ? 'insoluble' : 'non vérifié (budget dépassé)'}, ${result.statesExplored} états`);
    process.exit(1);
}
console.log(`${parsed.level.id} : ${result.trace.length} coups, ${result.buffered} passage(s) au tampon, ${result.statesExplored} états`);
console.log(result.trace.join(' '));
if (args.includes('--write')) {
    const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };
    const meta = { ...parsed.level.meta, solution: result.trace, engineVersion: version, statesExplored: result.statesExplored };
    writeFileSync(path, `${JSON.stringify({ ...parsed.level, meta }, null, 2)}\n`);
    console.log(`solution écrite dans ${path}`);
}
