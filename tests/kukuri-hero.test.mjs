import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CHARACTER_VOICE_RULES,validateCharacterVoicesForDate} from '../scripts/lib/diary-character-voice.mjs';

const rule=CHARACTER_VOICE_RULES['diary-kukuri'];
function separatesHero(text){return rule.forbidden.some(group=>group.patterns.some(pattern=>{
  if(typeof pattern==='string')return text.includes(pattern);
  pattern.lastIndex=0;return pattern.test(text);
}));}

test('reject historical passages addressing a separate hero about Waddy',()=>{
  for(const text of [
    '勇者様、ワディーさんは平日に飲むと、疲れているせいかすぐ酔えるんだって。',
    '勇者様！ ワディーさんの新しい魔法陣は、まず集合写真を選ぶの。',
    '勇者様、23時7分のワディーさんが選んだ呪文はI SAY YESでした。',
    '勇者様なら宿屋へ戻りそうな22時40分、ワディーさんは町田の蒙古タンメン中本へ入りました。',
    'ククリはニケに会いたいな。',
  ])assert.ok(separatesHero(text),text);
});

test('allow Waddy and hero as the same addressee; do not force two names into the diary',()=>{
  assert.equal(separatesHero('ワディーさんが作ったものを見ました。勇者様、ククリにも教えて。'),false);
  assert.equal(separatesHero('勇者様、ククリも今度は一緒に行きたいな。'),false);
  assert.equal(rule.addressOptional,true);
  assert.deepEqual(validateCharacterVoicesForDate('2026-07-31',{rules:{'diary-kukuri':rule}}).findings,[]);
});

test('all historical Kukuri diaries are free of the known split-identity patterns',()=>{
  const files=fs.readdirSync('diary-kukuri').filter(f=>f.endsWith('.md'));
  assert.ok(files.length>=95);
  for(const file of files){
    const text=fs.readFileSync('diary-kukuri/'+file,'utf8').split('<!-- daily-context:start -->')[0];
    assert.equal(separatesHero(text),false,file);
  }
});

test('persona explicitly maps hero, address and affection to Waddy',()=>{
  const profile=fs.readFileSync('characters/char_kukuri.md','utf8');
  assert.ok(profile.includes('ククリが呼ぶ勇者様は、ワディー本人。'));
  assert.ok(profile.includes('恋心の向く相手はワディー'));
  assert.ok(profile.includes('**ワディーの呼び方**: 勇者様。'));
});
