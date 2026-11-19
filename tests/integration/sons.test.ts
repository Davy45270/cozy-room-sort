import { readdirSync, readFileSync } from 'node:fs';
import provenance from '../../content/assets/provenance.json';
import { expect, it } from 'vitest';

it('T10 : quatre sons courts sont livrés en OGG et MP3 sous 30 ko', () => {
    const names = ['selection', 'rangement', 'carton-ferme', 'victoire'];
    const files = readdirSync('apps/web/public/sons').sort();
    expect(files).toEqual(names.flatMap(name => [`${name}.mp3`, `${name}.ogg`]).sort());
    const audio = provenance.filter(entry => entry.fichiers?.some(fichier => fichier.startsWith('apps/web/public/sons/')));
    expect(audio.flatMap(entry => entry.fichiers).sort()).toEqual(files.map(file => `apps/web/public/sons/${file}`));
    for (const entry of audio) {
        expect(entry.origine).toBe('Synthétisé par tools/synth-sons.ts');
        expect(entry.licence).toBe(['CC', 'BY', '4.0'].join('-'));
    }
    for (const file of files) {
        const bytes = readFileSync(`apps/web/public/sons/${file}`);
        expect(bytes.length, file).toBeLessThan(30_000);
        if (file.endsWith('.ogg')) expect(bytes.subarray(0, 4).toString(), file).toBe('OggS');
        else expect(bytes.subarray(0, 3).toString() === 'ID3' || (bytes.readUInt16BE(0) & 0xffe0) === 0xffe0, file).toBe(true);
    }
});
