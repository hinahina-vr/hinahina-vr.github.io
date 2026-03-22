/**
 * build-diary-rem.mjs
 * diary-rem/*.md を読み込んで diary-rem.html を生成する
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { marked } from "marked";
import { stripDailyContextBlock } from "./lib/daily-context.mjs";
import { injectSiteModeAssets } from "./lib/site-mode-assets.mjs";

const DIARY_DIR = join(import.meta.dirname, "..", "diary-rem");
const OUT_FILE = join(import.meta.dirname, "..", "diary-rem.html");

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
    <title>レムの日記 | ゼロから始める</title>
    <meta name="description" content="レムは、スバルくんの日記を書きます。" />
    <link rel="stylesheet" href="./styles.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;700&display=swap" rel="stylesheet">
    <style>
      body {
        background: linear-gradient(135deg, #e8eeff 0%, #d8e0ff 30%, #e0eaff 60%, #f0f4ff 100%);
        color: #3040608;
        font-family: "M PLUS Rounded 1c", "Hiragino Sans", "Yu Gothic", sans-serif;
        min-height: 100vh;
      }
      .stars { display: none; }
      .page-frame { background: transparent; }
      .rem-header {
        text-align: center;
        padding: 40px 20px 20px;
      }
      .rem-header .smallline {
        color: #5080d0;
        font-size: 12px;
        letter-spacing: 0.3em;
      }
      .rem-header h1 {
        color: #4060b0;
        font-size: 1.8em;
        text-shadow: 0 0 20px rgba(64, 96, 176, 0.3);
        letter-spacing: 0.1em;
      }
      .rem-header .tagline {
        color: #5080d0;
        font-size: 13px;
      }
      .panel {
        background: rgba(255, 255, 255, 0.6);
        border: 1px solid rgba(64, 96, 176, 0.2);
        border-radius: 12px;
        backdrop-filter: blur(8px);
        max-width: 900px;
        margin: 16px auto;
        padding: 20px 24px;
      }
      .panel h2 {\n        color: #304070;\n        background: none;
        border: none;
        text-shadow: none;
        border-bottom: 1px dashed rgba(64, 96, 176, 0.3);
        padding-bottom: 8px;
        font-size: 1.1em;
      }
      .entry-list {
        list-style: none;
        padding: 0;
      }
      .entry-list li {
        border-left: 3px solid #80a0e0;
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
        color: #7090c0;
        font-size: 12px;
        margin: 0;
      }
      .entry-title {
        color: #3050a0;
        font-size: 1.1em;
        margin: 4px 0 8px;
      }
      .entry-list li p {
        color: #304070;
      }
      .back-link {
        color: #102040;
        background: linear-gradient(180deg, #a0b8e8, #6090d0);
        border-color: #80a0e0;
        text-decoration: none;
        font-size: 13px;
      }
      .back-link:hover {
        color: #001030;
        background: linear-gradient(180deg, #b0c8f0, #70a0d8);
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
      <header class="rem-header">
        <p class="smallline">✦ ゼロから始める ✦</p>
        <h1>レムの日記</h1>
        <p class="tagline">レムは、スバルくんを信じています。</p>
      </header>

      <section class="panel">
        <p style="color: #5080d0; font-size: 13px; line-height: 1.8; margin: 0;">✦ レム ── 「Re:ゼロから始める異世界生活」（2016年）のメイド。双子の姉ラムと共にロズワール邸で働く鬼族の少女。</p>
      </section>

      <section class="panel">
        <p>
          <a class="back-link" href="./diary.html">← ワディーさんの日記へ戻る</a>
        </p>
      </section>

      <section class="panel">
        <h2>✦ レムの記録</h2>
        <ul class="entry-list">
${entryListItems}
        </ul>
      </section>

      <footer class="retro-footer">
        <p style="color: #5080d0; font-size: 11px;">レムは、ここで待っています。</p>
      </footer>
    </main>
  </body>
</html>
`;

  await writeFile(OUT_FILE, injectSiteModeAssets(html), "utf-8");
  console.log(`✓ diary-rem.html generated (${entries.length} entries)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
