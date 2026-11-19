import { readdirSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const root = 'content/assets/planches';

/** Dimensions lues dans l'en-tête du WebP (VP8X, VP8L ou VP8), sans décoder l'image. */
function webpSize(bytes: Buffer): { w: number; h: number } {
    if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') throw new Error('pas un WebP');
    const chunk = bytes.toString('ascii', 12, 16);
    if (chunk === 'VP8X') return { w: 1 + bytes.readUIntLE(24, 3), h: 1 + bytes.readUIntLE(27, 3) };
    if (chunk === 'VP8L') {
        const bits = bytes.readUInt32LE(21);
        return { w: 1 + (bits & 0x3fff), h: 1 + ((bits >>> 14) & 0x3fff) };
    }
    if (chunk === 'VP8 ') return { w: bytes.readUInt16LE(26) & 0x3fff, h: bytes.readUInt16LE(28) & 0x3fff };
    throw new Error(`bloc WebP inconnu : ${chunk}`);
}

it('lit les dimensions des trois formats d’en-tête WebP', () => {
    const riff = (chunk: string, body: number[]): Buffer => Buffer.from([...Buffer.from('RIFF\0\0\0\0WEBP'), ...Buffer.from(chunk), 0, 0, 0, 0, ...body]);
    // VP8X : drapeaux (4 octets), puis largeur-1 et hauteur-1 sur 24 bits.
    expect(webpSize(riff('VP8X', [0, 0, 0, 0, 0x13, 0x04, 0, 0x0b, 0x03, 0]))).toEqual({ w: 0x414, h: 0x30c });
    // VP8L : signature 0x2f, puis 14 bits de largeur-1 et 14 bits de hauteur-1.
    const bits = (659 & 0x3fff) | (527 << 14);
    expect(webpSize(riff('VP8L', [0x2f, bits & 255, (bits >>> 8) & 255, (bits >>> 16) & 255, (bits >>> 24) & 255]))).toEqual({ w: 660, h: 528 });
    // VP8 : 3 octets d'étiquette, la signature 9d 01 2a, puis largeur et hauteur sur 14 bits.
    expect(webpSize(riff('VP8 ', [0, 0, 0, 0x9d, 0x01, 0x2a, 200, 0, 100, 0]))).toEqual({ w: 200, h: 100 });
});

it('chaque cadre de chaque index d’atlas tient dans les dimensions réelles de son WebP', () => {
    const indexes = readdirSync(`${root}/atlas`).filter(file => file.endsWith('.json'));
    expect(indexes.length).toBeGreaterThan(0);
    let frames = 0;
    for (const file of indexes) {
        const atlas = JSON.parse(readFileSync(`${root}/atlas/${file}`, 'utf8')) as {
            frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>; meta: { size: { w: number; h: number } };
        };
        const size = webpSize(readFileSync(`${root}/atlas/${file.replace(/\.json$/, '.webp')}`));
        expect(atlas.meta.size, file).toEqual(size);
        for (const [key, { frame }] of Object.entries(atlas.frames)) {
            frames++;
            expect(frame.x, `${file} ${key}`).toBeGreaterThanOrEqual(0);
            expect(frame.y, `${file} ${key}`).toBeGreaterThanOrEqual(0);
            expect(frame.x + frame.w, `${file} ${key}`).toBeLessThanOrEqual(size.w);
            expect(frame.y + frame.h, `${file} ${key}`).toBeLessThanOrEqual(size.h);
        }
    }
    expect(frames).toBeGreaterThan(100);
});
