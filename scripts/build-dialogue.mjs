/**
 * build-dialogue.mjs
 * dialogue/*.md を読み込んで dialogue.html を生成する
 *
 * Markdown規約:
 *   frontmatter(---で囲む): title, subtitle, date
 *   ## で章タイトル
 *   **スピーカー名**: で発言ブロック開始
 *   それ以外の段落は直前のスピーカーの続き
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";

const DIALOGUE_DIR = join(import.meta.dirname, "..", "dialogue");
const OUT_FILE = join(import.meta.dirname, "..", "dialogue.html");

function parseFrontmatter(raw) {
    const cleaned = raw.replace(/^\uFEFF?/, "");
    const m = cleaned.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!m) return { meta: {}, body: cleaned };
    const meta = {};
    for (const line of m[1].split(/\r?\n/)) {
        const kv = line.match(/^(\w+)\s*:\s*(.+)$/);
        if (kv) meta[kv[1]] = kv[2].trim();
    }
    return { meta, body: m[2] };
}

function parseDialogue(body) {
    const lines = body.split(/\r?\n/);
    const sections = [];
    let currentSection = null;
    let currentSpeaker = null;
    let currentBlock = null;

    for (const line of lines) {
        // 章タイトル
        const headingMatch = line.match(/^##\s+(.+)$/);
        if (headingMatch) {
            if (currentBlock && currentSection) currentSection.blocks.push(currentBlock);
            currentBlock = null;
            currentSpeaker = null;
            currentSection = { title: headingMatch[1], blocks: [] };
            sections.push(currentSection);
            continue;
        }

        // スピーカー行
        const speakerMatch = line.match(/^\*\*(.+?)\*\*:\s*(.*)$/);
        if (speakerMatch) {
            if (currentBlock && currentSection) currentSection.blocks.push(currentBlock);
            currentSpeaker = speakerMatch[1];
            currentBlock = { speaker: currentSpeaker, paragraphs: [] };
            if (speakerMatch[2].trim()) {
                currentBlock.paragraphs.push(speakerMatch[2].trim());
            }
            continue;
        }

        // 空行
        if (line.trim() === "") continue;

        // 続きの段落
        if (currentBlock) {
            currentBlock.paragraphs.push(line.trim());
        }
    }
    if (currentBlock && currentSection) currentSection.blocks.push(currentBlock);

    return sections;
}

function speakerClass(name) {
    if (name === "ワディー") return "waddy";
    if (name === "ひな") return "hina";
    return "other";
}

function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

async function main() {
    const files = (await readdir(DIALOGUE_DIR)).filter((f) => f.endsWith(".md"));
    if (files.length === 0) {
        console.warn("⚠ No dialogue files found");
        return;
    }

    // 全対談を結合（今は1つだが拡張可能）
    const allSections = [];
    let mainMeta = {};

    for (const file of files) {
        const raw = await readFile(join(DIALOGUE_DIR, file), "utf-8");
        const { meta, body } = parseFrontmatter(raw);
        if (!mainMeta.title) mainMeta = meta;
        const sections = parseDialogue(body);
        allSections.push(...sections);
    }

    let contentHtml = "";

    for (const section of allSections) {
        contentHtml += `\n<div class="section-divider">― ${escapeHtml(section.title)} ―</div>\n`;

        for (const block of section.blocks) {
            const cls = speakerClass(block.speaker);
            const label = block.speaker;
            const bodyHtml = block.paragraphs.map((p) => escapeHtml(p)).join("<br>\n");
            contentHtml += `<div class="talk-${cls}"><span class="talk-name">${escapeHtml(label)}</span>：${bodyHtml}</div>\n`;
        }
    }

    const title = mainMeta.title || "対談";
    const subtitle = mainMeta.subtitle || "";
    const date = mainMeta.date || "";

    const html = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} — ひなたとの対談 | ワディーゲストハウス</title>
    <meta name="description" content="${subtitle}" />
    <link rel="stylesheet" href="./styles.css" />
    <style>
      /* テキストサイト風 対談スタイル */
      .dialogue-body {
        max-width: 640px;
        margin: 0 auto;
        font-size: 14px;
        line-height: 2;
        color: #c0c0c0;
      }
      .section-divider {
        text-align: center;
        color: #999;
        margin: 32px 0 16px;
        font-size: 13px;
        letter-spacing: 0.3em;
      }
      .talk-waddy, .talk-hina, .talk-other {
        margin: 16px 0;
      }
      .talk-waddy .talk-name {
        color: #81eeff;
        font-weight: bold;
      }
      .talk-hina .talk-name {
        color: #f0a0b0;
        font-weight: bold;
      }
      .talk-waddy { color: #d0d0d0; }
      .talk-hina { color: #c8a8b0; }
      .dialogue-date {
        text-align: right;
        color: #666;
        font-size: 12px;
        margin-top: 32px;
      }
    </style>
  </head>
  <body class="diary-despair">
    <div class="stars" aria-hidden="true"></div>
    <main class="page-frame">
      <header class="retro-header">
        <p class="smallline">Special Feature</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="tagline">${escapeHtml(subtitle)}</p>
      </header>

      <section class="panel">
        <p>
          <a class="back-link" href="./index.html">トップページへ戻る</a>
          <a class="back-link" href="./diary.html">日記ページへ</a>
          <a class="back-link" href="./galge-guide.html">ギャルゲ感想ページへ</a>
        </p>
      </section>

      <section class="panel">
        <div class="dialogue-body">
${contentHtml}
          <div class="dialogue-date">${date} 収録</div>
        </div>
      </section>

      <footer class="retro-footer">
        <p>Copyright (C) 1999-2026 ワディーゲストハウス All Rights Reserved.</p>
      </footer>
    </main>
  </body>
</html>
`;

    await writeFile(OUT_FILE, html, "utf-8");
    console.log(`✓ dialogue.html generated (${allSections.length} sections)`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
