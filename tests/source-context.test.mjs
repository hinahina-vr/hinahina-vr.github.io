import assert from "node:assert/strict";
import {
  loadSourceDiaryContext,
  parseEntrySourcePath,
  parseEntryTopics,
  parseSourceFileMeta,
} from "../scripts/lib/source-context.mjs";

function testParseEntrySourcePath() {
  const raw = `# 2026-04-11 テスト

本文

<!-- daily-context:start -->
## メタ情報（自動）

### 元ネタ
- diary/2026-04-11_世界観を更新したら縄文だった.md
<!-- daily-context:end -->
`;

  assert.equal(parseEntrySourcePath(raw), "diary/2026-04-11_世界観を更新したら縄文だった.md");
}

function testParseSourceFileMeta() {
  assert.deepEqual(
    parseSourceFileMeta("diary/2026-04-11_世界観を更新したら縄文だった.md"),
    { date: "2026-04-11", title: "世界観を更新したら縄文だった" },
  );
}

function testParseEntryTopics() {
  const raw = `# 2026-04-12 テスト

本文

<!-- daily-context:start -->
## メタ情報（自動）

### 元ネタ
- diary/2026-04-12_満足は翌日に残る.md

### 本日の話題
- A. 昨日の景気のいい行程を翌日に回収している
- G. 興奮の翌日に満足を受け取る採点
<!-- daily-context:end -->
`;

  assert.deepEqual(parseEntryTopics(raw), [
    "昨日の景気のいい行程を翌日に回収している",
    "興奮の翌日に満足を受け取る採点",
  ]);
}

async function run() {
  testParseEntrySourcePath();
  testParseSourceFileMeta();
  testParseEntryTopics();

  const sourceContext = await loadSourceDiaryContext({
    rawEntry: `# 2026-04-12 テスト

本文

<!-- daily-context:start -->
## メタ情報（自動）

### 元ネタ
- diary/2026-04-12_満足は翌日に残る.md

### 本日の話題
- B. 電子部品から始まる配線図のような前日
- E. 最後を肉で締める景気のよさ
<!-- daily-context:end -->
`,
  });

  assert.equal(sourceContext, null);

  console.log("source-context tests passed");
}

run();
