import { test } from "node:test";
import assert from "node:assert/strict";
import {readWritingModels, renderWritingModel} from "../scripts/lib/diary-writing-model.mjs";

test("recorded model is attributed only to its date and character rewrite", () => {
  const models = readWritingModels();
  const html = renderWritingModel("2026-05-05", models);
  assert.match(html, /GPT-6 Astra（gpt-6-astra）/);
  assert.match(html, /33人分のキャラクター日記の改稿/);
  assert.match(renderWritingModel("1900-01-01", models), /未記録/);
  assert.doesNotMatch(renderWritingModel("1900-01-01", models), /Astra/);
});

test("metadata is escaped and incomplete attribution fails the build", () => {
  const models = {"2026-05-05":{model:'<unsafe>',label:'A & B',scope:'"rewrite"',revisedOn:'2026-09-26'}};
  const html = renderWritingModel("2026-05-05", models);
  assert.match(html, /&lt;unsafe&gt;/);
  assert.match(html, /A &amp; B/);
  assert.throws(()=>renderWritingModel("2026-05-05", {"2026-05-05":{model:'x'}}), /Incomplete/);
});
