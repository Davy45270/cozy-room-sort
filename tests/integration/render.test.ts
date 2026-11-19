import { expect, it } from 'vitest';
import { readLevel } from '@cozy-room-sort/level-tools/files';
import { previewHtml } from '@cozy-room-sort/level-tools/preview';

it('prépare les cadres locaux, les objets masqués, les cartons et le tampon', () => {
    const level = readLevel('content/levels/004-salon.json');
    const html = previewHtml({ ...level, name: '<Exemple>' });
    expect(html).toContain('&lt;Exemple&gt;');
    expect(html).toContain('data-frame="vue-salon"');
    expect(html).toMatch(/file:\/\/[^'"\s]+\/planches\/atlas\/[^'"\s]+\.webp/);
    expect(html.match(/data-object=/g)).toHaveLength(level.objects.length);
    expect(html.match(/class="sprite hidden"/g)).toHaveLength(level.objects.filter(object => object.hidden).length);
    expect(html.match(/data-frame="carton-ouvert"/g)).toHaveLength(level.boxes.length);
    expect(html.match(/data-frame="case-tampon"/g)).toHaveLength(level.rules.bufferCapacity);
});
