/**
 * lib/build-diary-char.mjs
 * 共通キャラ日記ビルダー - 設定を渡すだけでHTMLを生成
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { marked } from "marked";
import { stripDailyContextBlock } from "./daily-context.mjs";
import { injectSiteModeAssets } from "./site-mode-assets.mjs";

/**
 * @param {Object} config
 * @param {string} config.id         - キャラID (例: "tama")
 * @param {string} config.name       - 表示名 (例: "たまちゃん")
 * @param {string} config.title      - ページタイトル (例: "たまちゃんの日記")
 * @param {string} config.subtitle   - サブタイトル (例: "萌えの殿堂から")
 * @param {string} config.tagline    - タグライン (例: "萌えー！")
 * @param {string} config.desc       - キャラ説明文
 * @param {string} config.emoji      - 見出し絵文字 (例: "🌸")
 * @param {string} config.bgGradient - 背景グラデーション
 * @param {string} config.textColor  - テキスト色
 * @param {string} config.accentColor - アクセント色
 * @param {string} config.borderColor - ボーダー色
 * @param {string} config.subtitleColor - サブタイトル色
 * @param {string} config.footer     - フッターメッセージ
 */
export async function buildCharDiary(config) {
  const ROOT = join(import.meta.dirname, "..", "..");
  const DIARY_DIR = join(ROOT, `diary-${config.id}`);
  const OUT_FILE = join(ROOT, `diary-${config.id}.html`);

  function parseFilename(filename) {
    const base = basename(filename, ".md");
    const match = base.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/);
    if (!match) return null;
    return { date: match[1], title: match[2] };
  }

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
    <title>${config.title} | ${config.subtitle}</title>
    <meta name="description" content="${config.tagline}" />
    <link rel="stylesheet" href="./styles.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;700&display=swap" rel="stylesheet">
    <style>
      body {
        background: ${config.bgGradient};
        color: ${config.textColor};
        font-family: "Zen Kaku Gothic New", "Hiragino Sans", "Yu Gothic", sans-serif;
        min-height: 100vh;
      }
      .stars { display: none; }
      .page-frame { background: transparent; }
      .char-header {
        text-align: center;
        padding: 40px 20px 20px;
      }
      .char-header .smallline {
        color: ${config.subtitleColor};
        font-size: 12px;
        letter-spacing: 0.3em;
      }
      .char-header h1 {
        color: ${config.accentColor};
        font-size: 1.8em;
        text-shadow: 0 0 20px ${config.accentColor}33;
        letter-spacing: 0.1em;
      }
      .char-header .tagline {
        color: ${config.subtitleColor};
        font-size: 13px;
      }
      .panel {
        background: rgba(255, 255, 255, 0.6);
        border: 1px solid ${config.borderColor}33;
        border-radius: 12px;
        backdrop-filter: blur(8px);
        max-width: 900px;
        margin: 16px auto;
        padding: 20px 24px;
      }
      .panel h2 {
        color: ${config.textColor};
        background: none;
        border: none;
        text-shadow: none;
        border-bottom: 1px dashed ${config.borderColor}4d;
        padding-bottom: 8px;
        font-size: 1.1em;
      }
      .entry-list {
        list-style: none;
        padding: 0;
      }
      .entry-list li {
        border-left: 3px solid ${config.borderColor};
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
        color: ${config.subtitleColor};
        font-size: 12px;
        margin: 0;
      }
      .entry-title {
        color: ${config.accentColor};
        font-size: 1.1em;
        margin: 4px 0 8px;
      }
      .entry-list li p {
        color: ${config.textColor};
      }
      .back-link {
        color: #1a3050;
        background: linear-gradient(180deg, ${config.borderColor}aa, ${config.borderColor});
        border-color: ${config.borderColor};
        text-decoration: none;
        font-size: 13px;
      }
      .back-link:hover {
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
      <header class="char-header">
        <p class="smallline">${config.emoji} ${config.subtitle} ${config.emoji}</p>
        <h1>${config.title}</h1>
        <p class="tagline">${config.tagline}</p>
      </header>

      <section class="panel">
        <p style="color: ${config.subtitleColor}; font-size: 13px; line-height: 1.8; margin: 0;">${config.emoji} ${config.desc}</p>
      </section>

      <section class="panel">
        <p>
          <a class="back-link" href="./diary.html">← ワディーの日記へ戻る</a>
        </p>
      </section>

      <section class="panel">
        <h2>${config.emoji} ${config.name}の記録</h2>
        <ul class="entry-list">
${entryListItems}
        </ul>
      </section>

      <footer class="retro-footer">
        <p style="color: ${config.subtitleColor}; font-size: 11px;">${config.footer}</p>
      </footer>
    </main>
  </body>
</html>
`;

  await writeFile(OUT_FILE, injectSiteModeAssets(html), "utf-8");
  console.log(`✓ diary-${config.id}.html generated (${entries.length} entries)`);
}
