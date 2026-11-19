import { parseArgs } from 'node:util';
import { readLevel } from '@cozy-room-sort/level-tools/files';
import { renderLevel } from '@cozy-room-sort/level-tools/render';

try {
    const { values, positionals } = parseArgs({
        options: { out: { type: 'string' } },
        allowPositionals: true
    });
    if (positionals.length !== 1) throw new Error('usage : level:render <fichier> [--out x.png]');
    const level = readLevel(positionals[0]!);
    const output = values.out ?? `${level.id}.png`;
    await renderLevel(level, output);
    console.log(output);
} catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
}
