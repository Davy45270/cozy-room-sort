// npm run level:validate -- <fichier|dossier>… : structure valide ET résolu par le solveur en mode classique.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { withMode } from '@cozy-room-sort/engine';
import { parseLevel } from '@cozy-room-sort/schemas';
import { replayTrace, solve } from '@cozy-room-sort/solver';

type Verdict = { ok: true; objects: number; buffered: number; states: number } | { ok: false; problem: string };

const files = (path: string): string[] => statSync(path).isDirectory()
    ? readdirSync(path).filter(f => f.endsWith('.json')).sort().flatMap(f => files(join(path, f)))
    : [path];

function check(path: string): Verdict {
    const parsed = parseLevel(readFileSync(path, 'utf8'));
    if (!parsed.ok) return { ok: false, problem: parsed.errors.map(e => `${e.path} : ${e.message}`).join(' ; ') };
    const level = parsed.level;
    if (level.meta?.solution && replayTrace(level, level.meta.solution) !== 'won') return { ok: false, problem: 'la solution enregistrée ne mène pas à la victoire' };
    const result = solve(withMode(level, 'classique'));
    if (result.kind === 'unsolvable') return { ok: false, problem: `insoluble (${result.statesExplored} états)` };
    if (result.kind === 'unverified') return { ok: false, problem: `non vérifié (budget dépassé après ${result.statesExplored} états)` };
    if (level.scoring.threeStarsMaxBuffered < result.buffered) {
        return { ok: false, problem: `trois étoiles à ${level.scoring.threeStarsMaxBuffered} passage(s) par le tampon, mais la meilleure solution en demande ${result.buffered}` };
    }
    return { ok: true, objects: level.objects.length, buffered: result.buffered, states: result.statesExplored };
}

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error('usage : level:validate <fichier|dossier>…');
    process.exit(2);
}
let failed = 0;
for (const path of args.flatMap(files)) {
    const id = basename(path, '.json');
    const verdict = check(path);
    if (verdict.ok) console.log(`OK ${id} ${verdict.objects} objets, ${verdict.buffered} passage(s) au tampon au mieux, ${verdict.states} états`);
    else {
        failed++;
        console.log(`ÉCHEC ${id} : ${verdict.problem}`);
    }
}
process.exit(failed === 0 ? 0 : 1);
