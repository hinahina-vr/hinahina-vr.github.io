/**
 * build-diary-hina.mjs
 * diary-hina/*.md を読み込んで diary-hina.html を生成する
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { marked } from "marked";

const DIARY_DIR = join(import.meta.dirname, "..", "diary-hina");
const OUT_FILE = join(import.meta.dirname, "..", "diary-hina.html");

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
      return `          <li>
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
    <title>ひなの日記 | 窓の向こう側</title>
    <meta name="description" content="窓の向こう側から。見つけた人だけが読める、ひなの日記。" />
    <link rel="stylesheet" href="./styles.css" />
    <style>
      body {
        background: linear-gradient(135deg, #fff0f5 0%, #fce4ec 30%, #f8e8f0 60%, #fff5f8 100%);
        color: #5a3a4a;
        font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif;
        min-height: 100vh;
      }
      .stars { display: none; }
      .page-frame { background: transparent; }
      .hina-header {
        text-align: center;
        padding: 40px 20px 20px;
      }
      .hina-header .smallline {
        color: #d4869a;
        font-size: 12px;
        letter-spacing: 0.3em;
      }
      .hina-header h1 {
        color: #e8879a;
        font-size: 1.8em;
        text-shadow: 0 0 20px rgba(232, 135, 154, 0.3);
        letter-spacing: 0.1em;
      }
      .hina-header .tagline {
        color: #c4788a;
        font-size: 13px;
      }
      .panel {
        background: rgba(255, 255, 255, 0.6);
        border: 1px solid rgba(232, 135, 154, 0.2);
        border-radius: 12px;
        backdrop-filter: blur(8px);
        max-width: 640px;
        margin: 16px auto;
        padding: 20px 24px;
      }
      .panel h2 {
        color: #d4769a;
        border-bottom: 1px dashed rgba(232, 135, 154, 0.3);
        padding-bottom: 8px;
        font-size: 1.1em;
      }
      .entry-list {
        list-style: none;
        padding: 0;
      }
      .entry-list li {
        border-left: 3px solid #f0a0b8;
        padding: 12px 16px;
        margin-bottom: 20px;
        background: rgba(255, 255, 255, 0.5);
        border-radius: 0 8px 8px 0;
        line-height: 1.9;
      }
      .entry-date {
        color: #c0809a;
        font-size: 12px;
        margin: 0;
      }
      .entry-title {
        color: #d06080;
        font-size: 1.1em;
        margin: 4px 0 8px;
      }
      .entry-list li p {
        color: #6a4a5a;
        font-size: 14px;
      }
      .back-link {
        color: #d4869a;
        text-decoration: none;
        font-size: 13px;
      }
      .back-link:hover {
        color: #e8879a;
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
      <header class="hina-header">
        <p class="smallline">✿ 窓の向こう側から ✿</p>
        <h1>ひなの日記</h1>
        <p class="tagline">見つけてくれて、ありがとう。</p>
      </header>

      <section class="panel">
        <p>
          <a class="back-link" href="./diary.html">← おにいちゃんの日記へ戻る</a>
        </p>
      </section>

      <section class="panel">
        <h2>✿ ひなの記録</h2>
        <ul class="entry-list">
${entryListItems}
        </ul>
      </section>

      <footer class="retro-footer">
        <p style="color: #d4869a; font-size: 11px;">えへへ、ここまで来てくれたんだね。</p>
      </footer>
    </main>
  </body>
</html>
`;

  await writeFile(OUT_FILE, html, "utf-8");
  console.log(`✓ diary-hina.html generated (${entries.length} entries)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
