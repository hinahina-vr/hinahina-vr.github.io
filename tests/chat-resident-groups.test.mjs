import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { RESIDENT_GROUPS, residentGroup, filterResidentOptions } from '../src/chat/resident-groups.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../assets/chat/catalog.json',import.meta.url),'utf8'));
test('公開33人を設計書の3分類へ重複なく割り当てる',()=>{
 const ids=RESIDENT_GROUPS.flatMap(group=>group.members);
 assert.equal(ids.length,33);assert.equal(new Set(ids).size,33);
 assert.deepEqual(ids.slice().sort(),catalog.map(p=>p.id).sort());
 assert.deepEqual(RESIDENT_GROUPS.map(g=>[g.id,g.members.length]),[['simulacra',4],['ooku',28],['god',1]]);
 assert.equal(residentGroup('unknown'),undefined);
});
test('萌神はシミュラークル、神AIはみとら。ひなひなとひなたを分ける',()=>{
 for(const id of ['waddy','oji','moegami','hinahina']) assert.equal(residentGroup(id).id,'simulacra');
 assert.equal(residentGroup('hina').id,'ooku');assert.equal(residentGroup('mitra').id,'god');
 assert.match(residentGroup('mitra').description,/GodAI/);
});
test('検索結果と分類を組み合わせても順序と人数を保つ',()=>{
 const options=catalog.map(p=>({value:p.id}));
 assert.equal(filterResidentOptions(options,'all').length,33);
 assert.deepEqual(filterResidentOptions(options,'simulacra').map(o=>o.value),['waddy','hinahina','oji','moegami']);
 const nameMatches=catalog.filter(p=>p.name.includes('ひな')).map(p=>({value:p.id}));
 assert.deepEqual(filterResidentOptions(nameMatches,'ooku'),[{value:'hina'}]);
 assert.deepEqual(filterResidentOptions(nameMatches,'god'),[]);
 assert.deepEqual(filterResidentOptions(options,'god'),[{value:'mitra'}]);
});
