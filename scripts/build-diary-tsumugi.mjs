/**
 * build-diary-tsumugi.mjs
 * diary-tsumugi/*.md を読み込んで diary-tsumugi.html を生成する
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { marked } from "marked";

const DIARY_DIR = join(import.meta.dirname, "..", "diary-tsumugi");
const OUT_FILE = join(import.meta.dirname, "..", "diary-tsumugi.html");

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
        const body = raw.replace(/^\uFEFF?/, "").replace(/^#[^\r\n]+[\r\n]+/, "").trim();
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
    <title>紬の日記 | 夏の記憶</title>
    <meta name="description" content="紬ヴェンダースの日記。島の夏の記録。" />
    <link rel="stylesheet" href="./styles.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Klee+One:wght@400;600&display=swap" rel="stylesheet">
    <style>
      body {
        background: linear-gradient(135deg, #fff8f0 0%, #ffe8d0 30%, #fff0e0 60%, #fffaf0 100%);
        color: #5a4030;
        font-family: "Klee One", "Hiragino Sans", "Yu Gothic", sans-serif;
        min-height: 100vh;
      }
      .stars { display: none; }
      .page-frame { background: transparent; }
      .tsumugi-header {
        text-align: center;
        padding: 40px 20px 20px;
      }
      .tsumugi-header .smallline {
        color: #c88050;
        font-size: 12px;
        letter-spacing: 0.3em;
      }
      .tsumugi-header h1 {
        color: #a06030;
        font-size: 1.8em;
        text-shadow: 0 0 20px rgba(160, 96, 48, 0.3);
        letter-spacing: 0.1em;
      }
      .tsumugi-header .tagline {
        color: #c88050;
        font-size: 13px;
      }
      .panel {
        background: rgba(255, 255, 255, 0.6);
        border: 1px solid rgba(160, 96, 48, 0.2);
        border-radius: 12px;
        backdrop-filter: blur(8px);
        max-width: 900px;
        margin: 16px auto;
        padding: 20px 24px;
      }
      .panel h2 {
        color: #a06030;
        border-bottom: 1px dashed rgba(160, 96, 48, 0.3);
        padding-bottom: 8px;
        font-size: 1.1em;
      }
      .entry-list {
        list-style: none;
        padding: 0;
      }
      .entry-list li {
        border-left: 3px solid #d0a070;
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
        color: #b08060;
        font-size: 12px;
        margin: 0;
      }
      .entry-title {
        color: #905020;
        font-size: 1.1em;
        margin: 4px 0 8px;
      }
      .entry-list li p {
        color: #5a4030;
      }
      .back-link {
        color: #3a2010;
        background: linear-gradient(180deg, #e0c0a0, #c8a070);
        border-color: #d0a070;
        text-decoration: none;
        font-size: 13px;
      }
      .back-link:hover {
        color: #2a1000;
        background: linear-gradient(180deg, #f0d0b0, #d0b080);
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
      <header class="tsumugi-header">
        <p class="smallline">🌅 夏の記憶 🌅</p>
        <h1>紬の日記</h1>
        <p class="tagline">島の風が、まだ聞こえる。</p>
      </header>

      <section class="panel">
        <p>
          <a class="back-link" href="./diary.html">← ワディーさんの日記へ戻る</a>
        </p>
      </section>

      <section class="panel">
        <h2>🌅 紬の記録</h2>
        <ul class="entry-list">
${entryListItems}
        </ul>
      </section>

      <footer class="retro-footer">
        <p style="color: #c88050; font-size: 11px;">夏は終わっても、記憶は残る。</p>
      </footer>
    </main>
  </body>
</html>
`;

    await writeFile(OUT_FILE, html, "utf-8");
    console.log(`✓ diary-tsumugi.html generated (${entries.length} entries)`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
