/**
 * build-galge.mjs
 * galge/*.md を読み込んで galge-guide.html を生成する
 *
 * ファイル名規約: "タイトル.md"
 * 各mdの冒頭に YAML風メタデータ（---で囲む）を置く:
 *   brand, release, genre, scenario, play_period
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { marked } from "marked";

const GALGE_DIR = join(import.meta.dirname, "..", "galge");
const OUT_FILE = join(import.meta.dirname, "..", "galge-guide.html");

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

async function main() {
    const files = (await readdir(GALGE_DIR)).filter((f) => f.endsWith(".md"));

    const entries = [];
    for (const file of files) {
        const title = basename(file, ".md");
        const raw = await readFile(join(GALGE_DIR, file), "utf-8");
        const { meta, body } = parseFrontmatter(raw);
        const html = await marked.parse(body.trim());
        entries.push({ title, meta, html });
    }

    // タイトル順にソート
    entries.sort((a, b) => a.title.localeCompare(b.title, "ja"));

    const entryCards = entries
        .map((e) => {
            const metaItems = [];
            if (e.meta.brand) metaItems.push(`ブランド: ${e.meta.brand}`);
            if (e.meta.release) metaItems.push(`発売日: ${e.meta.release}`);
            if (e.meta.genre) metaItems.push(`ジャンル: ${e.meta.genre}`);
            if (e.meta.scenario) metaItems.push(`シナリオ: ${e.meta.scenario}`);
            if (e.meta.play_period) metaItems.push(`プレイ時期: ${e.meta.play_period}`);
            const metaHtml = metaItems.length
                ? `<article class="guide-card"><h3>諸元</h3><ul>${metaItems.map((i) => `<li>${i}</li>`).join("")}</ul></article>`
                : "";
            return `      <section class="panel">
        <h2>${e.title}</h2>
        <div class="guide-grid">
          ${metaHtml}
          <article class="guide-card">
            <h3>感想</h3>
            ${e.html}
          </article>
        </div>
      </section>`;
        })
        .join("\n\n");

    const html = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ギャルゲ感想ページ | ワディーゲストハウス</title>
    <meta name="description" content="プレイしたギャルゲ・ビジュアルノベルの感想をまとめています。" />
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body class="diary-despair">
    <div class="stars" aria-hidden="true"></div>
    <main class="page-frame">
      <header class="retro-header">
        <p class="smallline">Galge Impressions</p>
        <h1>ギャルゲ感想ページ</h1>
        <p class="tagline">プレイした作品の感想を、ネタバレ込みで残していく。</p>
        <marquee behavior="scroll" direction="left" scrollamount="5">
          ★ ネタバレ注意 ★ 未プレイの方は自己責任で ★
        </marquee>
      </header>

      <section class="panel">
        <p>
          <a class="back-link" href="./index.html">トップページへ戻る</a>
          <a class="back-link" href="./diary.html">日記ページへ</a>
          <a class="back-link" href="./videos.html">動画紹介コーナーへ</a>
        </p>
      </section>

${entryCards}

      <footer class="retro-footer">
        <p>Copyright (C) 1999-2026 ワディーゲストハウス All Rights Reserved.</p>
      </footer>
    </main>
  </body>
</html>
`;

    await writeFile(OUT_FILE, html, "utf-8");
    console.log(`✓ galge-guide.html generated (${entries.length} entries)`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
