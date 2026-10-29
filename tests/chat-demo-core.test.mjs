import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DEMO_IDS, DEMO_CHOICES, demoGreeting, demoReply, streamDemo } from '../src/chat/demo.mjs';
import { DEMO_REACTIONS } from '../src/chat/demo-reactions.mjs';

const catalog = JSON.parse(fs.readFileSync(new URL('../assets/chat/catalog.json', import.meta.url)));
test('全33人に固有の挨拶・話題・リアクションを用意する', () => {
  const ids = catalog.map(p => p.id).sort();
  assert.equal(ids.length, 33);
  assert.deepEqual([...DEMO_IDS].sort(), ids);
  assert.deepEqual(Object.keys(DEMO_REACTIONS).sort(), ids);
  for (const prompt of [...DEMO_CHOICES, 'うん']) {
    const replies = ids.map(id => demoReply(id, prompt));
    assert.equal(new Set(replies).size, 33, prompt);
    for (const reply of replies) {
      assert.ok(reply.length > 8);
      assert.doesNotMatch(reply, /undefined|APIキー/);
    }
  }
  for (const id of ids) assert.match(demoGreeting(id), /APIキー/);
});
test('連続する同じ挨拶にも別の台詞を返し、未知の質問にはAPI案内を返す', () => {
  for (const id of DEMO_IDS) {
    const company = demoReply(id, 'そばにいて');
    assert.notEqual(demoReply(id, 'そばにいて', [{role:'assistant',content:company}]), company);
    const home = demoReply(id, 'ただいま');
    assert.notEqual(demoReply(id, 'ただいま', [{role:'assistant',content:home}]), home);
    assert.match(demoReply(id, '宇宙定数の値を教えて'), /APIキー/);
    assert.match(demoReply(id, 'this variable is broken'), /APIキー/);
    assert.match(demoReply(id, 'APIキーはどこ？'), /APIキー/);
    assert.doesNotMatch(demoReply(id, 'もっとかわいいね'), /APIキー/);
  }
});
test('短い相づちを長文の理解と混同せず、キャラの呼び方を保つ', () => {
  assert.match(demoReply('hina','うん'), /おにいちゃん/);
  assert.doesNotMatch(demoReply('hina','そばにいて'), /です|ます|ください/);
  assert.match(demoReply('mii','一緒にいて'), /お兄タン|みぃタン/);
  assert.match(demoReply('kukuri','そばにいて'), /勇者様/);
  assert.match(demoReply('dejiko','うん'), /にょ/);
  assert.match(demoReply('hina','うん、明日の東京の天気を教えて'), /APIキー/);
  assert.match(demoReply('hina','好きじゃない'), /APIキー/);
});
test('キーなしストリームは外部通信せず、返事を最後まで表示して停止にも応じる', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Demo must not use the network'); };
  try {
    const chunks = [];
    const reply = await streamDemo({id:'hina',text:'うん',history:[],signal:new AbortController().signal,onText:t=>chunks.push(t)});
    assert.equal(chunks.at(-1),reply);
    const controller = new AbortController();
    const pending = streamDemo({id:'mii',text:'ただいま',history:[],signal:controller.signal,onText:()=>controller.abort(new Error('stop'))});
    await assert.rejects(pending,/stop/);
  } finally { globalThis.fetch = original; }
});
