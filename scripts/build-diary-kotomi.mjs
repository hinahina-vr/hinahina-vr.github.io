/**
 * build-diary-kotomi.mjs
 * diary-kotomi/*.md -> diary-kotomi.html
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { marked } from "marked";
const DIARY_DIR = join(import.meta.dirname, "..", "diary-kotomi");
const OUT_FILE = join(import.meta.dirname, "..", "diary-kotomi.html");
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
    if (!meta) { console.warn("skip: " + file); continue; }
    const raw = await readFile(join(DIARY_DIR, file), "utf-8");
    const body = raw.replace(/^\uFEFF?/, "").replace(/^#[^\r\n]+[\r\n]+/, "").trim();
    const html = await marked.parse(body);
    entries.push({ ...meta, html });
  }
  entries.sort((a, b) => b.date.localeCompare(a.date));
  const WEEKDAYS = ["日","月","火","水","木","金","土"];
  const entryListItems = entries.map((e) => {
    const d = new Date(e.date + "T00:00:00+09:00");
    const dow = WEEKDAYS[d.getDay()];
    return `+"          <li id=\"" + e.date + "\">\n            <p class=\"entry-date\">" + e.date + "（" + dow + "）</p>\n            <h3 class=\"entry-title\">" + e.title + "</h3>\n            " + e.html + "\n          </li>";
  }).join("\n");
  const html = `+"<!doctype html>\n<html lang=\"ja\">\n  <head>\n    <meta charset=\"UTF-8\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n    <title>ことみの日記 | たんぽぽ娘の記録</title>\n    <meta name=\"description\" content=\"バイオリン、弾いてもいいですか？\" />\n    <link rel=\"stylesheet\" href=\"./styles.css\" />\n    <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n    <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n    <link href=\"https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;700&display=swap\" rel=\"stylesheet\">\n    <style>\n      body {\n        background: linear-gradient(135deg, #f0fff0 0%, #d8f8d8 30%, #e8ffe8 60%, #f8fff8 100%);\n        color: #2a4a2a;\n        font-family: \"Zen Kaku Gothic New\", \"Hiragino Sans\", \"Yu Gothic\", sans-serif;\n        min-height: 100vh;\n      }\n      .stars { display: none; }\n      .page-frame { background: transparent; }\n      .char-header {\n        text-align: center;\n        padding: 40px 20px 20px;\n      }\n      .char-header .smallline {\n        color: #60a060;\n        font-size: 12px;\n        letter-spacing: 0.3em;\n      }\n      .char-header h1 {\n        color: #308030;\n        font-size: 1.8em;\n        text-shadow: 0 0 20px rgba(0,0,0,0.1);\n        letter-spacing: 0.1em;\n      }\n      .char-header .tagline {\n        color: #60a060;\n        font-size: 13px;\n      }\n      .panel {\n        background: rgba(255, 255, 255, 0.6);\n        border: 1px solid rgba(0,0,0,0.1);\n        border-radius: 12px;\n        backdrop-filter: blur(8px);\n        max-width: 900px;\n        margin: 16px auto;\n        padding: 20px 24px;\n      }\n      .panel h2 {\n        color: #308030;\n        border-bottom: 1px dashed rgba(0,0,0,0.15);\n        padding-bottom: 8px;\n        font-size: 1.1em;\n      }\n      .entry-list {\n        list-style: none;\n        padding: 0;\n      }\n      .entry-list li {\n        border-left: 3px solid #80c080;\n        padding: 12px 16px;\n        margin-bottom: 20px;\n        background: rgba(255, 255, 255, 0.5);\n        border-radius: 0 8px 8px 0;\n        line-height: 1.9;\n      }\n      .entry-list li img {\n        max-width: 100%;\n        height: auto;\n        border-radius: 4px;\n        margin: 12px 0;\n      }\n      .entry-date {\n        color: #60a060;\n        font-size: 12px;\n        margin: 0;\n      }\n      .entry-title {\n        color: #308030;\n        font-size: 1.1em;\n        margin: 4px 0 8px;\n      }\n      .entry-list li p {\n        color: #2a4a2a;\n      }\n      .back-link {\n        color: #2a4a2a;\n        background: linear-gradient(180deg, #e8ffe8, #80c080);\n        border-color: #80c080;\n        text-decoration: none;\n        font-size: 13px;\n      }\n      .back-link:hover {\n        text-decoration: underline;\n      }\n      .retro-footer {\n        text-align: center;\n        padding: 24px;\n        border-top: none;\n        background: transparent;\n      }\n    </style>\n  </head>\n  <body>\n    <main class=\"page-frame\">\n      <header class=\"char-header\">\n        <p class=\"smallline\">🌼 たんぽぽ娘の記録 🌼</p>\n        <h1>ことみの日記</h1>\n        <p class=\"tagline\">バイオリン、弾いてもいいですか？</p>\n      </header>\n\n      <section class=\"panel\">\n        <p style=\"color: #60a060; font-size: 13px; line-height: 1.8; margin: 0;\">🌼 一ノ瀬ことみ ── 「CLANNAD」（2004年）のヒロイン。全国模試全科目一桁の天才。たんぽぽ娘。</p>\n      </section>\n\n      <section class=\"panel\">\n        <p>\n          <a class=\"back-link\" href=\"./diary.html\">← ワディーさんの日記へ戻る</a>\n        </p>\n      </section>\n\n      <section class=\"panel\">\n        <h2>🌼 記録</h2>\n        <ul class=\"entry-list\">\n" + entryListItems + "\n        </ul>\n      </section>\n\n      <footer class=\"retro-footer\">\n        <p style=\"color: #60a060; font-size: 11px;\">ここまで読んでくださったのですか……ありがとうございます。</p>\n      </footer>\n    </main>\n  </body>\n</html>\n";
  await writeFile(OUT_FILE, html, "utf-8");
  console.log("✓ diary-kotomi.html generated (" + entries.length + " entries)");
}
main().catch((err) => { console.error(err); process.exit(1); });
