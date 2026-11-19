import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseLevel, type Level } from '@cozy-room-sort/schemas';

export function levelFiles(path: string): string[] {
    if (!statSync(path).isDirectory()) return [path];
    return readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
        if (entry.name.startsWith('.')) return [];
        const file = join(path, entry.name);
        if (entry.isDirectory()) return levelFiles(file);
        return entry.name.endsWith('.json') ? [file] : [];
    });
}

export function readLevel(path: string): Level {
    const result = parseLevel(readFileSync(path, 'utf8'));
    if (result.ok) return result.level;
    throw new Error(result.errors.map(({ path: field, message }) => `${field} : ${message}`).join(' ; '));
}
