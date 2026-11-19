// npm run level:validate -- <fichier|dossier>… : structure valide ET résolu par le solveur en mode classique.
import { basename } from 'node:path';
import { withMode } from '@cozy-room-sort/engine';
import { levelFiles, readLevel } from '@cozy-room-sort/level-tools/files';
import { replayTrace, solve } from '@cozy-room-sort/solver';

type Verdict = { ok: true; objects: number; buffered: number; states: number } | { ok: false; problem: string };

function check(path: string): Verdict {
    const level = readLevel(path);
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
function report(path: string): boolean {
    const id = basename(path, '.json');
    try {
        const verdict = check(path);
        if (verdict.ok) {
            console.log(`OK ${id} ${verdict.objects} objets, ${verdict.buffered} passage(s) au tampon au mieux, ${verdict.states} états`);
            return true;
        }
        console.log(`ÉCHEC ${id} : ${verdict.problem}`);
    } catch (error) {
        console.log(`ÉCHEC ${id} : ${error instanceof Error ? error.message : String(error)}`);
    }
    return false;
}

for (const path of args) {
    try {
        const files = levelFiles(path);
        if (files.length === 0) throw new Error('aucun niveau JSON');
        for (const file of files) if (!report(file)) process.exitCode = 1;
    } catch (error) {
        console.log(`ÉCHEC ${path} : ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = 1;
    }
}
