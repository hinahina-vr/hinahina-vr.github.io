import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { PORTRAIT_FILES, portraitUrl } from '../src/chat/portraits.mjs';
const root = new URL('../', import.meta.url);
test('カタログ33人の立ち絵が欠けず、実体がWebPとして配布される', async () => {
 const catalog = JSON.parse(await readFile(new URL('assets/chat/catalog.json',root),'utf8'));
 const people = Array.isArray(catalog) ? catalog : catalog.personas;
 assert.equal(people.length,33);
 assert.deepEqual(Object.keys(PORTRAIT_FILES).sort(),people.map(p=>p.id).sort());
 for (const person of people) {
  const url = new URL(portraitUrl(person.id)); url.search='';
  const bytes = await readFile(url);
  assert.equal(bytes.toString('ascii',0,4),'RIFF',person.id);
  assert.equal(bytes.toString('ascii',8,12),'WEBP',person.id);
  assert.ok(bytes.length>1000,person.id);
 }
});
test('変更対象外のワディーとみとらは元データを保持する', async () => {
 for (const [id,hash] of [
  ['waddy','4bd9c2bae7f864d17b13c6a42feb905d9d34ad666379d880a2e2015a08ac305f'],
  ['mitra','d0f15332a6099b50b430816352f1e7eee25f9999190ec4a7081fe864090e45d1']]) {
   const url=new URL(portraitUrl(id));url.search='';
   assert.equal(createHash('sha256').update(await readFile(url)).digest('hex'),hash,id);
 }
});
test('ひなたの反応差分が同梱され、長身の旧リグを表示経路に戻さない', async () => {
 for (const pose of ['wave','happy']) {
  const bytes=await readFile(new URL('assets/chat/characters/hina-cute-'+pose+'-v1.webp',root));
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
 }
 const source=await readFile(new URL('src/chat/immersive.mjs',root),'utf8');
 assert.match(source,/hinata-cute\.mjs/);
 assert.doesNotMatch(source,/hinata-layered\.mjs/);
});
