import assert from 'node:assert/strict';
import console from 'node:console';
import { readdirSync, readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = new URL('../dist/', import.meta.url);
const source = new URL('../content/assets/planches/atlas/', import.meta.url);
const worker = readFileSync(new URL('sw.js', root), 'utf8');
const urls = [...new Set([...worker.matchAll(/\burl:\s*"([^"]+)"/g)].map(match => match[1]))];
assert(urls.includes('index.html'), 'La page principale manque au précache');
assert(urls.some(url => /^assets\/.*\.js$/.test(url)), 'Le code du jeu manque au précache');

const library = /(?:-meubles|p04-ui)[.-]/;
const built = readdirSync(new URL('assets/', root));
assert(!built.some(file => library.test(file)), 'Un atlas de la bibliothèque entre dans le build');
const atlasFiles = readdirSync(source).filter(file => !library.test(file));
const atlasUrls = new Set();
for (const file of atlasFiles) {
    const dot = file.lastIndexOf('.');
    const base = file.slice(0, dot);
    const ext = file.slice(dot);
    const url = urls.find(path => path.startsWith(`assets/${base}-`) && path.endsWith(ext));
    assert(url, `Atlas absent du précache : ${file}`);
    atlasUrls.add(url);
}
// Le panneau des quotas de la salle de bain s'affiche hors ligne dès la première visite : il est au précache.
assert(atlasFiles.includes('p04-quotas.webp'), 'Atlas du panneau de la salle de bain absent du précache : p04-quotas.webp');

// Les sons facultatifs s'activent aussi hors ligne : les deux formats sont au précache.
for (const name of ['selection', 'rangement', 'carton-ferme', 'victoire']) for (const ext of ['ogg', 'mp3']) {
    assert(urls.includes(`sons/${name}.${ext}`), `Son absent du précache : sons/${name}.${ext}`);
}

let raw = 0;
let compressed = 0;
let atlases = 0;
for (const url of urls) {
    assert(!url.startsWith('catalog/'), `Ressource de bibliothèque précachée : ${url}`);
    assert(!/^(?:[a-z]+:|\/)|\.\./i.test(url), `Ressource non locale : ${url}`);
    const contents = readFileSync(new URL(url, root));
    raw += contents.byteLength;
    compressed += gzipSync(contents, { level: 9 }).byteLength;
    if (atlasUrls.has(url)) atlases += contents.byteLength;
}
const budget = 1_400_000;
console.log(`Précache : ${urls.length} fichiers, ${raw} octets bruts, ${compressed} octets gzip (plafond ${budget}).`);
console.log(`Atlas : ${atlasUrls.size / 2} paires, ${atlases} octets bruts (images et index).`);
assert(compressed <= budget, `Précache hors budget : ${compressed} > ${budget} octets gzip`);
