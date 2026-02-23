/**
 * build-diary.mjs
 * diary/*.md を読み込んで diary.html を生成する
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { marked } from "marked";

const DIARY_DIR = join(import.meta.dirname, "..", "diary");
const OUT_FILE = join(import.meta.dirname, "..", "diary.html");

// ファイル名 "YYYY-MM-DD_タイトル.md" から日付とタイトルを抽出
function parseFilename(filename) {
  const base = basename(filename, ".md");
  const match = base.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/);
  if (!match) return null;
  return { date: match[1], title: match[2] };
}

async function main() {
  const files = (await readdir(DIARY_DIR)).filter((f) => f.endsWith(".md"));

  const entries = [];
  for (const file of files) {
    const meta = parseFilename(file);
    if (!meta) {
      console.warn(`⚠ skip: ${file} (invalid name format)`);
      continue;
    }
    const raw = await readFile(join(DIARY_DIR, file), "utf-8");
    // 最初の # 見出し行を除去（タイトルはファイル名から取得するため）
    const body = raw.replace(/^\uFEFF?/, "").replace(/^#[^\r\n]+[\r\n]+/, "").trim();
    const html = await marked.parse(body);
    entries.push({ ...meta, html });
  }

  // 日付の新しい順にソート
  entries.sort((a, b) => b.date.localeCompare(a.date));

  const entryListItems = entries
    .map(
      (e) => `          <li>
            <p class="entry-date">${e.date}</p>
            <h3 class="entry-title">${e.title}</h3>
            ${e.html}
          </li>`
    )
    .join("\n");

  const html = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>日記ページ | ワディーゲストハウス</title>
    <meta name="description" content="ワディーゲストハウスの日記ページ。活動メモと近況ログ。" />
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body class="diary-despair">
    <div class="stars" aria-hidden="true"></div>
    <main class="page-frame">
      <header class="retro-header">
        <p class="smallline">意識を持ったこと――それが生命の原罪だった。</p>
        <h1>日記ページ</h1>
        <p class="tagline">やがて澱みに還る、ある意識の記録。</p>
        <marquee behavior="scroll" direction="left" scrollamount="5">
          ★ この世界は、まだ終わっていない ★
        </marquee>
      </header>

      <section class="panel">
        <p>
          <a class="back-link" href="./index.html">トップページへ戻る</a>
          <a class="back-link" href="./videos.html">動画紹介コーナーへ</a>
          <a class="back-link" href="./galge-guide.html">ギャルゲ攻略ページへ</a>
        </p>
      </section>

      <section class="panel">
        <h2>最近の日記</h2>
        <ul class="entry-list">
${entryListItems}
        </ul>
      </section>

      <footer class="retro-footer">
        <p>Copyright (C) 1999-2026 ワディーゲストハウス All Rights Reserved.</p>
      </footer>
    </main>
  </body>
</html>
`;

  await writeFile(OUT_FILE, html, "utf-8");
  console.log(`✓ diary.html generated (${entries.length} entries)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
