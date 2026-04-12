import assert from "node:assert/strict";
import {
  extractLeadParagraphsFromMarkdown,
  parseEntrySourcePath,
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

function testExtractLeadParagraphsFromMarkdown() {
  const raw = `# 2026-04-11 世界観を更新したら縄文だった

文字や会話だけでくたびれて、酒を飲んで踊っていたくなる日がある。

それでも深夜には新しい道具をいじっていて、未来と原始が同居していた。

<p style="text-align:center;">✦ 夢を見る</p>

<!-- daily-context:start -->
## 今日のメモ（自動）
<!-- daily-context:end -->
`;

  assert.deepEqual(extractLeadParagraphsFromMarkdown(raw), [
    "文字や会話だけでくたびれて、酒を飲んで踊っていたくなる日がある。",
    "それでも深夜には新しい道具をいじっていて、未来と原始が同居していた。",
  ]);
}

function run() {
  testParseEntrySourcePath();
  testParseSourceFileMeta();
  testExtractLeadParagraphsFromMarkdown();
  console.log("source-context tests passed");
}

run();
