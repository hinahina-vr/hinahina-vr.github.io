import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'characters.html'), 'utf8');
const personas = [];
for (const card of html.matchAll(/<div class="char-card card-([a-z0-9-]+)">([\s\S]*?)(?=\s*<!--|\s*<\/div>\s*<\/div>\s*<div class="group-header")/g)) {
  const [, id, contents] = card;
  const name = contents.match(/class="char-name">([^<]+)</)?.[1];
  const emoji = contents.match(/class="char-emoji">([^<]+)</)?.[1];
  if (!name || !emoji) throw new Error(`Missing public name: ${id}`);
  const file = path.join(root, 'characters', `char_${id}.md`);
  const base = fs.readFileSync(file, 'utf8').trim();
  if (!base) throw new Error(`Empty profile: ${id}`);
  personas.push({ id, name, emoji, base });
}
if (personas.length !== 33 || new Set(personas.map(p => p.id)).size !== 33) throw new Error('33 existing profiles required');
const publicCatalog = personas.map(({ id, name, emoji }) => ({ id, name, emoji }));
const target = path.join(root, 'assets/chat');
fs.mkdirSync(path.join(target, 'personas'), { recursive: true });
fs.writeFileSync(path.join(target, 'catalog.json'), JSON.stringify(publicCatalog, null, 2) + '\n');
for (const persona of personas) fs.writeFileSync(path.join(target, 'personas', `${persona.id}.json`), JSON.stringify(persona) + '\n');
console.log(`Built ${personas.length} chat profiles from unchanged character settings. Profile contents are not rendered in the UI; client-side assets are inspectable.`);
