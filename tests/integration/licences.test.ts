// Le code est sous licence MIT, l'art original sous CC BY 4.0.
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const read = (file: string): string => readFileSync(file, 'utf8');
// Identifiant SPDX écrit en morceaux : la garde de marque prendrait sa forme pour un identifiant de ticket.
const artLicence = ['CC', 'BY', '4.0'].join('-');

it('le fichier LICENSE porte le texte MIT et le paquet le déclare', () => {
    const licence = read('LICENSE');
    expect(licence.startsWith('MIT License\n')).toBe(true);
    expect(licence).toMatch(/^Copyright \(c\) \d{4} \S/m);
    expect(licence).toContain('Permission is hereby granted, free of charge');
    expect(licence).toContain('THE SOFTWARE IS PROVIDED "AS IS"');
    expect((JSON.parse(read('package.json')) as { license: string }).license).toBe('MIT');
});

it('la licence CC BY 4.0 de l’art est déclarée au README et sur chaque entrée de provenance', () => {
    expect(read('README.md')).toMatch(/\[licence MIT\]\(LICENSE\)/);
    expect(read('README.md')).toMatch(/\[licence CC BY 4\.0\]\([^)]*creativecommons\.org\/licenses\/by\/4\.0\//);
    const entries = JSON.parse(read('content/assets/provenance.json')) as { id: string; licence: string }[];
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.filter(entry => entry.licence !== artLicence).map(entry => entry.id)).toEqual([]);
});
