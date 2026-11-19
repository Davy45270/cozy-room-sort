import { withMode } from '@cozy-room-sort/engine';
import { measureDecisions, solve } from '@cozy-room-sort/solver';
import { levelFiles, readLevel } from '@cozy-room-sort/level-tools/files';

function benchmark(path: string) {
    const level = withMode(readLevel(path), 'classique');
    const started = performance.now();
    const result = solve(level, { strategy: 'auto', maxMs: 10_000, clock: () => performance.now() });
    const durationMs = Math.round((performance.now() - started) * 100) / 100;
    const decisions = measureDecisions(level);
    return {
        id: level.id, status: result.kind, statesExplored: result.statesExplored, durationMs,
        optimalLength: result.kind === 'solved' ? result.trace.length : null,
        optimalBuffered: result.kind === 'solved' ? result.buffered : null,
        nonTrivialDecisions: decisions?.nonTrivialDecisions ?? null,
        legalMoves: decisions?.legalMoves ?? null,
        blockingMoves: decisions?.blockingMoves ?? null,
        blockingMoveShare: decisions?.blockingMoveShare ?? null
    };
}

try {
    const args = process.argv.slice(2);
    const rows = (args.length === 0 ? ['content/levels'] : args).flatMap(levelFiles).map(benchmark);
    console.log(JSON.stringify(rows, null, 2));
    // stderr garde le tableau accessible même lorsque stdout est redirigé vers un fichier JSON.
    const table = new console.Console(process.stderr);
    table.table(rows.map(row => ({
        Niveau: row.id, Statut: row.status, États: row.statesExplored, ms: row.durationMs, Coups: row.optimalLength,
        Tampon: row.optimalBuffered, Décisions: row.nonTrivialDecisions,
        Blocage: row.blockingMoveShare === null ? '?' : `${(row.blockingMoveShare * 100).toFixed(1)} %`
    })));
    if (rows.some(row => row.status !== 'solved' || row.blockingMoveShare === null)) process.exitCode = 1;
} catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
}
