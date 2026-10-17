import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const repo=path.resolve(import.meta.dirname,'..');
function fixture(t) {
 const parent=path.join(repo,'.local');fs.mkdirSync(parent,{recursive:true});
 const root=fs.mkdtempSync(path.join(parent,'editorial-check-'));
 t.after(()=>{assert.ok(path.resolve(root).startsWith(parent+path.sep));fs.rmSync(root,{recursive:true,force:true});});
 fs.mkdirSync(path.join(root,'scripts'));fs.cpSync(path.join(repo,'scripts/lib'),path.join(root,'scripts/lib'),{recursive:true});
 for(const script of ['check-diary-readability.mjs','check-diary-topic-distribution.mjs','check-diary-kanji-numerals.mjs','check-diary-editorial-independence.mjs'])fs.copyFileSync(path.join(repo,'scripts',script),path.join(root,'scripts',script));
 fs.mkdirSync(path.join(root,'diary'));
 const main=path.join(root,'diary','2026-08-29_遊び.md');
 const run=script=>spawnSync(process.execPath,[path.join(root,'scripts',script),'--date','2026-08-29'],{cwd:root,encoding:'utf8'});
 return {root,main,run};
}
test('readability examines rendered prose, ignoring author notes while still rejecting long prose',t=>{
 const {main,run}=fixture(t);
 const notes='<!-- bungou-style:start -->\n## 文豪AIメモ（自動）\n'+'抽象的な構造と未来の文脈を検討する'.repeat(20)+'\n<!-- bungou-style:end -->';
 fs.writeFileSync(main,'# 2026-08-29 遊び\n\n遊びたいゲームがある。\n\n'+notes);
 let result=run('check-diary-readability.mjs');assert.equal(result.status,0,result.stderr);
 fs.writeFileSync(main,'# 2026-08-29 遊び\n\n'+'遊びたいゲームがある'.repeat(40)+'。\n\n'+notes);
 result=run('check-diary-readability.mjs');assert.equal(result.status,1);assert.match(result.stderr,/一文が長すぎる/);
});
test('single-topic exemption is explicit and does not hide concentration or missing metadata',t=>{
 const {root,main,run}=fixture(t);
 const block=topics=>'<!-- daily-context:start -->\n### 本日の話題\n'+topics+'\n<!-- daily-context:end -->';
 for(const id of ['hina','ayu','multi','kud','rem','kotomi']){
  const dir=path.join(root,'diary-'+id);fs.mkdirSync(dir);fs.writeFileSync(path.join(dir,'2026-08-29_遊び.md'),'# 2026-08-29 遊び\n本文。\n'+block('- A. ゲーム'));
 }
 const check=()=>run('check-diary-topic-distribution.mjs');
 fs.writeFileSync(main,'# 2026-08-29 遊び\n本文。');assert.equal(check().status,1,'undeclared main stays strict');
 fs.writeFileSync(main,'# 2026-08-29 遊び\n本文。\n'+block('- A. ゲーム'));assert.equal(check().status,0,'explicit single topic passes');
 fs.writeFileSync(main,'# 2026-08-29 遊び\n本文。\n'+block('- A. ゲーム\n- B. 食事'));assert.equal(check().status,1,'multiple main topics retain limit');
 fs.writeFileSync(main,'# 2026-08-29 遊び\n本文。\n'+block('- B. 食事'));assert.equal(check().status,1,'unrelated declaration does not exempt A');
 fs.writeFileSync(main,'# 2026-08-29 遊び\n本文。\n'+block('- A. ゲーム'));
 fs.writeFileSync(path.join(root,'diary-hina','2026-08-29_遊び.md'),'# 2026-08-29 遊び\n本文。');assert.equal(check().status,1,'missing voice metadata still fails');
});

test('hangover idiom is allowed without allowing counted days',t=>{
 const {main,run}=fixture(t);
 fs.writeFileSync(main,'# 2026-08-29 飲み物\n\n二日酔いにならなかった。');
 assert.equal(run('check-diary-kanji-numerals.mjs').status,0);
 fs.writeFileSync(main,'# 2026-08-29 飲み物\n\n二日酔いのあと二日休んだ。');
 const result=run('check-diary-kanji-numerals.mjs');assert.equal(result.status,1);assert.match(result.stderr,/「二日」/);
});

test('editorial independence ignores hidden source metadata and still rejects a public source mention',t=>{
 const {root,main,run}=fixture(t);
 const metadata='<!-- daily-context:start -->\n### X\n### Swarm\n<!-- daily-context:end -->';
 fs.writeFileSync(main,'# 2026-08-29 遊び\n\n遊びに出かける。\n\n'+metadata);
 for(const dir of fs.readdirSync(repo).filter(d=>d.startsWith('diary-')&&fs.statSync(path.join(repo,d)).isDirectory())){
  const file=fs.readdirSync(path.join(repo,dir)).find(f=>f.startsWith('2026-08-19_')&&f.endsWith('.md'));
  assert.ok(file);fs.mkdirSync(path.join(root,dir));
  fs.writeFileSync(path.join(root,dir,'2026-08-29_声.md'),fs.readFileSync(path.join(repo,dir,file),'utf8').replaceAll('2026-08-19','2026-08-29'));
 }
 fs.mkdirSync(path.join(root,'scenarios'));
 fs.writeFileSync(path.join(root,'scenarios','2026-08-29_夢.json'),'{}');
 let result=run('check-diary-editorial-independence.mjs');assert.equal(result.status,0,result.stderr);
 fs.writeFileSync(main,'# 2026-08-29 遊び\n\nSwarmの記録を見た。\n\n'+metadata);
 result=run('check-diary-editorial-independence.mjs');assert.equal(result.status,1);assert.match(result.stderr,/禁止語 Swarm/);
});
