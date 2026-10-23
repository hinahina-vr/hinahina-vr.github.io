import assert from 'node:assert/strict';
import test from 'node:test';
import { collectKanjiNumericFindings as scan } from './check-diary-kanji-numerals.mjs';

test('source names are retained as names, not generations', () => {
  assert.deepEqual(scan('秋風。千代ちゃん。千代大海。千佳と千夜。'), []);
});
test('counts beside names still fail', () => {
  assert.deepEqual(scan('千代大海を十回、千代ちゃんを二回。').map(x => x.value), ['十回', '二回']);
});
test('a bare generation count and compound numbers still fail', () => {
  assert.deepEqual(scan('千代にわたる。二千代。千代目。千人。').map(x => x.value), ['千代', '二千代', '千代', '千人']);
});
test('existing idiom and inline-markup exceptions are unchanged', () => {
  assert.deepEqual(scan('十分に休む。二日酔い。' + '`千人` [一人](https://example.com)'), []);
});
test('adjacent numeric mistakes retain source line and column', () => {
  const line = '千代ちゃんが千代大海を三回見た。';
  assert.deepEqual(scan('見出し\n' + line), [{line: 2, column: line.indexOf('三回') + 1, value:'三回'}]);
});
test('ordinary half-width counts remain accepted', () => {
  assert.deepEqual(scan('2026年9月26日。30発。13時間。1人。'), []);
});
