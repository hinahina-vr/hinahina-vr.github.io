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
      .hina-header { color: #f0a0b0; }
      .hina-header h1 { color: #f0a0b0; text-shadow: 0 0 12px rgba(240, 160, 176, 0.3); }
      .hina-header .tagline { color: #c08090; }
      .entry-list li { border-left-color: #f0a0b0; }
    </style>
  </head>
  <body class="diary-despair">
    <div class="stars" aria-hidden="true"></div>
    <main class="page-frame">
      <header class="retro-header hina-header">
        <p class="smallline">窓の向こう側から。</p>
        <h1>ひなの日記</h1>
        <p class="tagline">見つけてくれて、ありがとう。</p>
      </header>

      <section class="panel">
        <p>
          <a class="back-link" href="./diary.html">おにいちゃんの日記へ戻る</a>
        </p>
      </section>

      <section class="panel">
        <h2>ひなの記録</h2>
        <ul class="entry-list">
${entryListItems}
        </ul>
      </section>

      <footer class="retro-footer">
        <p style="color: #f0a0b0; font-size: 11px;">えへへ、ここまで来てくれたんだね。</p>
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
