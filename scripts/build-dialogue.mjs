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

    // 画像行
    if (line.trim().match(/^!\[.*\]\(.*\)$/)) {
      if (currentBlock && currentSection) currentSection.blocks.push(currentBlock);
      currentBlock = null;
      if (currentSection) currentSection.blocks.push({ type: 'image', raw: line.trim() });
      continue;
    }

    // テーブル行
    if (line.trim().startsWith('|')) {
      if (currentBlock && currentSection) currentSection.blocks.push(currentBlock);
      currentBlock = null;
      // Collect consecutive table lines
      const lastBlock = currentSection ? currentSection.blocks[currentSection.blocks.length - 1] : null;
      if (lastBlock && lastBlock.type === 'table') {
        lastBlock.lines.push(line.trim());
      } else if (currentSection) {
        currentSection.blocks.push({ type: 'table', lines: [line.trim()] });
      }
      continue;
    }

    // 引用行
    if (line.trim().startsWith('>')) {
      if (currentBlock && currentSection) currentSection.blocks.push(currentBlock);
      currentBlock = null;
      if (currentSection) currentSection.blocks.push({ type: 'quote', text: line.trim().replace(/^>\s*/, '') });
      continue;
    }

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

function renderInline(str) {
  let s = str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Markdown images: ![alt](src)
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;margin:12px 0;border-radius:4px;">');
  return s;
}

function renderTable(lines) {
  let html = '<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px;">';
  for (let i = 0; i < lines.length; i++) {
    const cells = lines[i].split('|').filter((_, j, a) => j > 0 && j < a.length - 1).map(c => c.trim());
    // Skip separator row (|---|---|)
    if (cells.every(c => /^[-:]+$/.test(c))) continue;
    const tag = i === 0 ? 'th' : 'td';
    const style = tag === 'th'
      ? 'style="border-bottom:1px solid #555;padding:4px 8px;color:#e0c8a0;text-align:left;"'
      : 'style="padding:4px 8px;border-bottom:1px solid #333;"';
    html += '<tr>' + cells.map(c => `<${tag} ${style}>${renderInline(c)}</${tag}>`).join('') + '</tr>';
  }
  html += '</table>';
  return html;
}

function escapeHtml(str) {
  return renderInline(str);
}

async function main() {
  const files = (await readdir(DIALOGUE_DIR)).filter((f) => f.endsWith(".md"));
  if (files.length === 0) {
    console.warn("⚠ No dialogue files found");
    return;
  }

  // 各対談を個別にパースし、日付降順（新しい順）でソート
  const dialogues = [];
  for (const file of files) {
    const raw = await readFile(join(DIALOGUE_DIR, file), "utf-8");
    const { meta, body } = parseFrontmatter(raw);
    const sections = parseDialogue(body);
    dialogues.push({ meta, sections, file });
  }
  dialogues.sort((a, b) => (b.meta.date || "").localeCompare(a.meta.date || ""));

  let contentHtml = "";
  let totalSections = 0;

  for (let i = 0; i < dialogues.length; i++) {
    const { meta, sections } = dialogues[i];
    totalSections += sections.length;

    // 対談間の区切り
    if (i > 0) {
      contentHtml += `\n<div class="dialogue-separator"></div>\n`;
    }

    // 各対談のタイトルヘッダー
    contentHtml += `\n<div class="dialogue-header">`;
    contentHtml += `<h2 class="dialogue-title">${escapeHtml(meta.title || "無題")}</h2>`;
    if (meta.subtitle) {
      contentHtml += `<p class="dialogue-subtitle">${escapeHtml(meta.subtitle)}</p>`;
    }
    contentHtml += `</div>\n`;

    for (const section of sections) {
      contentHtml += `\n<div class="section-divider">― ${escapeHtml(section.title)} ―</div>\n`;

      for (const block of section.blocks) {
        if (block.type === 'table') {
          contentHtml += renderTable(block.lines) + '\n';
          continue;
        }
        if (block.type === 'image') {
          contentHtml += `<div style="text-align:center;margin:16px 0;">${renderInline(block.raw)}</div>\n`;
          continue;
        }
        if (block.type === 'quote') {
          contentHtml += `<blockquote style="border-left:3px solid #e0c8a0;margin:12px 0;padding:4px 16px;color:#aaa;font-style:italic;">${renderInline(block.text)}</blockquote>\n`;
          continue;
        }
        const cls = speakerClass(block.speaker);
        const label = block.speaker;
        const bodyHtml = block.paragraphs.map((p) => escapeHtml(p)).join("<br>\n");
        contentHtml += `<div class="talk-${cls}"><span class="talk-name">${escapeHtml(label)}</span>：${bodyHtml}</div>\n`;
      }
    }

    // 各対談の日付
    if (meta.date) {
      contentHtml += `<div class="dialogue-date">${meta.date} 収録</div>\n`;
    }
  }

  const html = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ひなたとの対談 | ワディーゲストハウス</title>
    <meta name="description" content="ワディーとひなたの対談記録" />
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
      .dialogue-header {
        text-align: center;
        margin: 48px 0 24px;
      }
      .dialogue-title {
        color: #e0c8a0;
        font-size: 22px;
        letter-spacing: 0.15em;
        margin: 0 0 8px;
      }
      .dialogue-subtitle {
        color: #888;
        font-size: 13px;
        font-style: italic;
        margin: 0;
      }
      .dialogue-separator {
        border: none;
        border-top: 1px solid #333;
        margin: 64px auto;
        max-width: 200px;
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
        <h1>ひなたとの対談</h1>
        <p class="tagline">深夜、テキストだけで交わした対話の記録。</p>
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
  console.log(`✓ dialogue.html generated (${dialogues.length} dialogues, ${totalSections} sections)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
