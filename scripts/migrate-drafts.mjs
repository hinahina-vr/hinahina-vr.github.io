/**
 * 過去の日記からdaily-contextブロックを抽出し、drafts/ に下書きファイルを生成する。
 * 日記本文からはdaily-contextブロックを除去する。
 *
 * Usage: node scripts/migrate-drafts.mjs
 */

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, basename } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const DIARY_DIR = join(ROOT, "diary");
const DRAFTS_DIR = join(ROOT, "drafts");

const DC_START = "<!-- daily-context:start -->";
const DC_END = "<!-- daily-context:end -->";
const DC_BLOCK_RE = /\n?<!-- daily-context:start -->[\s\S]*?<!-- daily-context:end -->\n?/g;

async function main() {
  await mkdir(DRAFTS_DIR, { recursive: true });

  const files = (await readdir(DIARY_DIR))
    .filter(f => f.endsWith(".md") && /^\d{4}-\d{2}-\d{2}_/.test(f) && !f.includes("下書き"));

  let migrated = 0;
  let stripped = 0;

  for (const file of files) {
    const filePath = join(DIARY_DIR, file);
    const content = await readFile(filePath, "utf-8");

    if (!content.includes(DC_START)) {
      // daily-contextブロックがない→空の下書きを作成
      const date = file.match(/^(\d{4}-\d{2}-\d{2})_/)?.[1];
      if (!date) continue;

      const title = file.replace(/^\d{4}-\d{2}-\d{2}_/, "").replace(/\.md$/, "");
      const draftPath = join(DRAFTS_DIR, `${date}_下書き.md`);
      const draftContent = `# ${date} 下書き\n\n## 元ネタ・話題候補\n\n（メイン日記: ${title}）\n\n<!-- daily-context:start -->\n## 今日のメモ（自動）\n\n### Swarm\n- 該当なし\n\n### X\n- 該当なし\n\n### Health\n- 取得できず\n\n### 話題候補\n- 今日は大きな補助トピックなし\n<!-- daily-context:end -->\n`;

      await writeFile(draftPath, draftContent, "utf-8");
      migrated++;
      continue;
    }

    // daily-contextブロックがある→抽出してdrafts/に移動、日記から除去
    const date = file.match(/^(\d{4}-\d{2}-\d{2})_/)?.[1];
    if (!date) continue;

    const title = file.replace(/^\d{4}-\d{2}-\d{2}_/, "").replace(/\.md$/, "");

    // daily-contextブロックを抽出
    DC_BLOCK_RE.lastIndex = 0;
    const match = DC_BLOCK_RE.exec(content);
    const dcBlock = match ? match[0].trim() : "";

    // drafts/ に下書きファイルを作成
    const draftPath = join(DRAFTS_DIR, `${date}_下書き.md`);
    const draftContent = `# ${date} 下書き\n\n## 元ネタ・話題候補\n\n（メイン日記: ${title}）\n\n${dcBlock}\n`;
    await writeFile(draftPath, draftContent, "utf-8");

    // 日記本文からdaily-contextブロックを除去
    DC_BLOCK_RE.lastIndex = 0;
    const cleaned = content
      .replace(DC_BLOCK_RE, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trimEnd() + "\n";
    await writeFile(filePath, cleaned, "utf-8");

    migrated++;
    stripped++;
  }

  // 既存の _下書き.md ファイルを drafts/ に移動
  const draftFiles = (await readdir(DIARY_DIR)).filter(f => f.includes("下書き") && f.endsWith(".md"));
  for (const df of draftFiles) {
    const date = df.match(/^(\d{4}-\d{2}-\d{2})_/)?.[1];
    if (!date) continue;
    const srcPath = join(DIARY_DIR, df);
    const dstPath = join(DRAFTS_DIR, df);
    const srcContent = await readFile(srcPath, "utf-8");
    await writeFile(dstPath, srcContent, "utf-8");
    // diary/から削除（移動）
    const { unlink } = await import("node:fs/promises");
    await unlink(srcPath);
    console.log(`  moved: ${df} → drafts/`);
  }

  console.log(`\n✓ ${migrated} drafts created in drafts/`);
  console.log(`✓ ${stripped} diary files had daily-context blocks stripped`);
  console.log(`✓ ${draftFiles.length} existing draft files moved`);
}

main().catch(err => { console.error(err); process.exit(1); });
