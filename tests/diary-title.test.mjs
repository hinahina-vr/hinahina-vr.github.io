import test from 'node:test';
import assert from 'node:assert/strict';
import { readDiaryTitle, escapeDiaryTitle } from '../scripts/lib/diary-title.mjs';

test('authored heading replaces historical filename without changing date or URL', () => {
  assert.equal(readDiaryTitle('\uFEFF# 2026-05-06 金色の箱に入った7種類の山の幸\r\n本文', '蛇口港で荷物を確かめる'), '金色の箱に入った7種類の山の幸');
  assert.equal(readDiaryTitle('# 日付なしの題名\n本文', '旧題'), '日付なしの題名');
  assert.equal(readDiaryTitle('本文のみ', '旧題'), '旧題');
});

test('title is rendered as text', () => {
  assert.equal(escapeDiaryTitle('<b> & "x"'), '&lt;b&gt; &amp; &quot;x&quot;');
});
