// Génère les fichiers distribués. Exécution hors ligne avec un encodeur disponible sur la machine.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

type Note = readonly [frequency: number, start: number, duration: number];
const sounds: Record<string, readonly Note[]> = {
    selection: [[523.25, 0, 0.09]],
    rangement: [[392, 0.06, 0.16], [523.25, 0.1, 0.17]],
    'carton-ferme': [[196, 0.055, 0.17], [293.66, 0.09, 0.2]],
    victoire: [[392, 0.055, 0.22], [493.88, 0.16, 0.23], [587.33, 0.27, 0.24], [783.99, 0.38, 0.34]]
};
const rate = 44_100;

function wave(notes: readonly Note[]): Buffer {
    const samples = Math.ceil(rate * Math.max(...notes.map(([, start, duration]) => start + duration)));
    const bytes = Buffer.alloc(44 + samples * 2);
    bytes.write('RIFF');
    bytes.writeUInt32LE(bytes.length - 8, 4);
    bytes.write('WAVEfmt ', 8);
    bytes.writeUInt32LE(16, 16);
    bytes.writeUInt16LE(1, 20);
    bytes.writeUInt16LE(1, 22);
    bytes.writeUInt32LE(rate, 24);
    bytes.writeUInt32LE(rate * 2, 28);
    bytes.writeUInt16LE(2, 32);
    bytes.writeUInt16LE(16, 34);
    bytes.write('data', 36);
    bytes.writeUInt32LE(samples * 2, 40);
    for (let i = 0; i < samples; i++) {
        let sample = 0;
        for (const [frequency, start, duration] of notes) {
            const t = i / rate - start;
            if (t < 0 || t >= duration) continue;
            const envelope = Math.min(t / 0.012, 1) * (1 - t / duration) ** 2;
            const phase = 2 * Math.PI * frequency * t;
            sample += 0.11 * envelope * (Math.sin(phase) + 0.15 * Math.sin(2 * phase));
        }
        bytes.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
    }
    return bytes;
}

const out = fileURLToPath(new URL('../apps/web/public/sons/', import.meta.url));
const work = mkdtempSync(join(tmpdir(), 'cozy-sons-'));
try {
    mkdirSync(out, { recursive: true });
    for (const [name, notes] of Object.entries(sounds)) {
        const source = join(work, `${name}.wav`);
        writeFileSync(source, wave(notes));
        for (const [ext, codec] of [['ogg', 'libvorbis'], ['mp3', 'libmp3lame']] as const) {
            execFileSync('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-i', source,
                '-c:a', codec, '-b:a', '64k', join(out, `${name}.${ext}`)]);
        }
    }
} finally {
    rmSync(work, { recursive: true, force: true });
}
