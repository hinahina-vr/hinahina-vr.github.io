/**
 * build-diary-ecoko.mjs
 * diary-ecoko/*.md を読み込んで diary-ecoko.html を生成する
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { marked } from "marked";
import { stripDailyContextBlock } from "./lib/daily-context.mjs";

const DIARY_DIR = join(import.meta.dirname, "..", "diary-ecoko");
const OUT_FILE = join(import.meta.dirname, "..", "diary-ecoko.html");

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
    const cleaned = stripDailyContextBlock(raw);
    const body = cleaned.replace(/^\uFEFF?/, "").replace(/^#[^\r\n]+[\r\n]+/, "").trim();
    const html = await marked.parse(body);
    entries.push({ ...meta, html });
  }

  entries.sort((a, b) => b.date.localeCompare(a.date));

  const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

  const entryListItems = entries
    .map((e) => {
      const d = new Date(e.date + "T00:00:00+09:00");
      const dow = WEEKDAYS[d.getDay()];
      return `          <li id="${e.date}">
            <p class="entry-date">${e.date}（${dow}）</p>
            <h3 class="entry-title">${e.title}</h3>
            ${e.html}
          </li>`;
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>えここの日記 | えっこあいす☆</title>
    <meta name="description" content="えっこあいすえっこあいす☆ えここの日記だよ。" />
    <link rel="stylesheet" href="./styles.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Kosugi+Maru&display=swap" rel="stylesheet">
    <style>
      body {
        background: linear-gradient(135deg, #d8f0ff 0%, #c0e0f8 30%, #d0e8ff 60%, #e8f4ff 100%);
        color: #2a4a6a;
        font-family: "Kosugi Maru", "Hiragino Sans", "Yu Gothic", sans-serif;
        min-height: 100vh;
      }
      .stars { display: none; }
      .page-frame { background: transparent; }
      .ecoko-header {
        text-align: center;
        padding: 40px 20px 20px;
      }
      .ecoko-header .smallline {
        color: #4080c0;
        font-size: 12px;
        letter-spacing: 0.3em;
      }
      .ecoko-header h1 {
        color: #3070b0;
        font-size: 1.8em;
        text-shadow: 0 0 20px rgba(48, 112, 176, 0.3);
        letter-spacing: 0.1em;
      }
      .ecoko-header .tagline {
        color: #4080c0;
        font-size: 13px;
      }
      .panel {
        background: rgba(255, 255, 255, 0.6);
        border: 1px solid rgba(48, 112, 176, 0.2);
        border-radius: 12px;
        backdrop-filter: blur(8px);
        max-width: 900px;
        margin: 16px auto;
        padding: 20px 24px;
      }
      .panel h2 {\n        color: #2a4870;\n        background: none;
        border: none;
        text-shadow: none;
        border-bottom: 1px dashed rgba(48, 112, 176, 0.3);
        padding-bottom: 8px;
        font-size: 1.1em;
      }
      .entry-list {
        list-style: none;
        padding: 0;
      }
      .entry-list li {
        border-left: 3px solid #60a0d0;
        padding: 12px 16px;
        margin-bottom: 20px;
        background: rgba(255, 255, 255, 0.5);
        border-radius: 0 8px 8px 0;
        line-height: 1.9;
      }
      .entry-list li img {
        max-width: 100%;
        height: auto;
        border-radius: 4px;
        margin: 12px 0;
      }
      .entry-date {
        color: #6098c0;
        font-size: 12px;
        margin: 0;
      }
      .entry-title {
        color: #2a5890;
        font-size: 1.1em;
        margin: 4px 0 8px;
      }
      .entry-list li p {
        color: #2a4870;
      }
      .entry-list li hr ~ p {
        color: #4878a0;
      }
      .back-link {
        color: #1a3050;
        background: linear-gradient(180deg, #90c0e0, #5898c8);
        border-color: #70a8d0;
        text-decoration: none;
        font-size: 13px;
      }
      .back-link:hover {
        color: #0a2040;
        background: linear-gradient(180deg, #a0d0f0, #70a8d0);
        text-decoration: underline;
      }
      .retro-footer {
        text-align: center;
        padding: 24px;
        border-top: none;
        background: transparent;
      }
    </style>
  </head>
  <body>
    <main class="page-frame">
      <header class="ecoko-header">
        <p class="smallline">🐧 えっこあいす☆ 🐧</p>
        <h1>えここの日記</h1>
        <p class="tagline">ペンギンさんといっしょ。</p>
      </header>

      <section class="panel">
        <p style="color: #4080c0; font-size: 13px; line-height: 1.8; margin: 0;">🐧 えここ（アイスちゃん）── 東北電力エコアイスminiのCMキャラクター（1999年）。ペンギン帽の少女。ペンギンさん（両親）といつも一緒。</p>
      </section>

      <section class="panel">
        <p>
          <a class="back-link" href="./diary.html">← ワディーさんの日記へ戻る</a>
        </p>
      </section>

      <section class="panel">
        <h2>🐧 えここの記録</h2>
        <ul class="entry-list">
${entryListItems}
        </ul>
      </section>

      <footer class="retro-footer">
        <p style="color: #4080c0; font-size: 11px;">えっこあいすえっこあいす☆ また来てね。</p>
      </footer>
    </main>
  </body>
</html>
`;

  await writeFile(OUT_FILE, html, "utf-8");
  console.log(`✓ diary-ecoko.html generated (${entries.length} entries)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
