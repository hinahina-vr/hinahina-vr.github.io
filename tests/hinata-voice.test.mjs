import test from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTER_VOICE_RULES,validateCharacterVoicesForDate} from '../scripts/lib/diary-character-voice.mjs';

const rule=CHARACTER_VOICE_RULES['diary-hina'];
function rejected(text){return rule.forbidden.some(group=>group.patterns.some(pattern=>{
  if(typeof pattern==='string')return text.includes(pattern);
  pattern.lastIndex=0;return pattern.test(text);
}));}
test('reject the polite phrases actually published in the rejected Hinata draft',()=>{
  for(const text of ['お出かけだったんですね。','行きたくなっちゃいそうです。','だめですよ。','おやすみはひなの番です。','ひなもいます。','お話を聞かせてください。'])assert.ok(rejected(text),text);
});
test('allow casual affectionate speech as requested by the user',()=>{
  assert.equal(rejected('おー、おにいちゃん。ひなもいるよ。えへへ、ひなの隣に来て。'),false);
  assert.equal(rejected('おにいちゃん、まっすぐこっちに来て。'),false);
  const result=validateCharacterVoicesForDate('2026-07-31',{rules:{'diary-hina':rule}});
  assert.deepEqual(result.findings,[]);
});
