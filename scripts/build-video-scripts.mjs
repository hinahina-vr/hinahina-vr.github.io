/**
 * build-video-scripts.mjs
 * dialogue/*.md から realize-video-gen 形式の YAML 台本を各回ごとに生成する
 */
import { readdir, readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { join, basename } from "node:path";

const ROOT_DIR = join(import.meta.dirname, "..");
const DIALOGUE_DIR = join(ROOT_DIR, "dialogue");
const OUT_DIR = join(ROOT_DIR, "video-scripts");

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
  let currentSpeech = null;

  const flushSpeech = () => {
    if (currentSpeech && currentSection) currentSection.blocks.push(currentSpeech);
    currentSpeech = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      flushSpeech();
      currentSection = { title: headingMatch[1], blocks: [] };
      sections.push(currentSection);
      continue;
    }

    const speakerMatch = line.match(/^\*\*(.+?)\*\*:\s*(.*)$/);
    if (speakerMatch) {
      flushSpeech();
      currentSpeech = {
        type: "speech",
        speaker: speakerMatch[1],
        paragraphs: [],
      };
      if (speakerMatch[2].trim()) currentSpeech.paragraphs.push(speakerMatch[2].trim());
      continue;
    }

    if (!currentSection) continue;
    if (trimmed === "") continue;

    if (/^!\[.*\]\(.*\)$/.test(trimmed)) {
      flushSpeech();
      currentSection.blocks.push({ type: "image", raw: trimmed });
      continue;
    }

    if (trimmed.startsWith("|")) {
      flushSpeech();
      const lastBlock = currentSection.blocks[currentSection.blocks.length - 1];
      if (lastBlock?.type === "table") {
        lastBlock.lines.push(trimmed);
      } else {
        currentSection.blocks.push({ type: "table", lines: [trimmed] });
      }
      continue;
    }

    if (trimmed.startsWith(">")) {
      flushSpeech();
      currentSection.blocks.push({
        type: "quote",
        text: trimmed.replace(/^>\s*/, ""),
      });
      continue;
    }

    if (currentSpeech) {
      currentSpeech.paragraphs.push(trimmed);
      continue;
    }

    currentSection.blocks.push({ type: "text", text: trimmed });
  }

  flushSpeech();
  return sections;
}

function stripMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => (alt ? `画像(${alt})` : `画像(${src})`))
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function tableToSpeech(lines) {
  const rows = [];
  for (const line of lines) {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length === 0) continue;
    if (cells.every((cell) => /^[-:]+$/.test(cell))) continue;
    rows.push(cells);
  }

  if (rows.length === 0) return "";
  if (rows.length === 1) return `表: ${rows[0].join(" / ")}`;

  const header = rows[0].map((cell, idx) => cell || (idx === 0 ? "項目" : `列${idx + 1}`));
  const bodyRows = rows.slice(1);
  const summarized = bodyRows
    .map((row) =>
      header
        .map((h, idx) => `${h}: ${row[idx] || ""}`.trim())
        .join("、")
    )
    .join("；");

  return summarized ? `表: ${summarized}` : `表: ${header.join(" / ")}`;
}

function imageToSpeech(raw) {
  const m = raw.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (!m) return "画像メモ";
  const alt = m[1].trim();
  const src = m[2].trim();
  return alt ? `画像メモ: ${alt}` : `画像メモ: ${src}`;
}

function speakerToChannel(speaker) {
  const normalized = speaker.replace(/\s+/g, "");
  if (normalized.startsWith("ひな")) return "right";
  return "left";
}

function yamlString(value) {
  return JSON.stringify(value ?? "");
}

function renderYaml(meta, scenes) {
  let out = "";
  out += `version: "1"\n`;
  out += `video:\n`;
  out += `  width: 1920\n`;
  out += `  height: 1080\n`;
  out += `  fps: 30\n`;
  out += `  backgroundColor: "#10131b"\n`;
  out += `avatar:\n`;
  out += `  vrm: assets/avatar/hinahina20241110_BIG.vrm\n`;
  out += `  idleMotion: y_pose\n`;
  out += `avatarRight:\n`;
  out += `  vrm: assets/avatar/hinahina20241110_BIG.vrm\n`;
  out += `  idleMotion: y_pose\n`;
  out += `voice:\n`;
  out += `  timeoutSec: 20\n`;
  out += `  bySpeaker:\n`;
  out += `    left:\n`;
  out += `      narrator: Japanese Male\n`;
  out += `      speed: 100\n`;
  out += `      pitch: -2\n`;
  out += `    right:\n`;
  out += `      narrator: Japanese Female Child\n`;
  out += `      speed: 106\n`;
  out += `      pitch: 20\n`;
  out += `scenes:\n`;

  for (const scene of scenes) {
    out += `  - id: ${scene.id}\n`;
    out += `    lines:\n`;
    for (const line of scene.lines) {
      out += `      - say: ${yamlString(line.say)}\n`;
      out += `        speaker: ${line.speaker}\n`;
      if (typeof line.pauseSec === "number") {
        out += `        pauseSec: ${line.pauseSec}\n`;
      }
    }
  }

  return out;
}

function toSceneLines(section) {
  const lines = [
    {
      say: `[face:neutral]${stripMarkdown(section.title)}`,
      speaker: "left",
      pauseSec: 0.2,
    },
  ];

  for (const block of section.blocks) {
    if (block.type === "speech") {
      const merged = stripMarkdown(block.paragraphs.join(" "));
      if (!merged) continue;
      lines.push({
        say: merged,
        speaker: speakerToChannel(block.speaker),
        pauseSec: 0.15,
      });
      continue;
    }

    if (block.type === "quote") {
      const text = stripMarkdown(block.text);
      if (!text) continue;
      lines.push({
        say: `引用: ${text}`,
        speaker: "left",
        pauseSec: 0.15,
      });
      continue;
    }

    if (block.type === "image") {
      lines.push({
        say: stripMarkdown(imageToSpeech(block.raw)),
        speaker: "left",
        pauseSec: 0.15,
      });
      continue;
    }

    if (block.type === "table") {
      const text = stripMarkdown(tableToSpeech(block.lines));
      if (!text) continue;
      lines.push({
        say: text,
        speaker: "left",
        pauseSec: 0.15,
      });
      continue;
    }

    if (block.type === "text") {
      const text = stripMarkdown(block.text);
      if (!text) continue;
      lines.push({
        say: text,
        speaker: "left",
        pauseSec: 0.15,
      });
    }
  }

  return lines;
}

function stableSlug(fileName) {
  const base = basename(fileName, ".md");
  const ascii = base
    .normalize("NFKD")
    .replace(/[^\w-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return ascii || "episode";
}

function sanitizeFileName(name) {
  return name
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const existing = await readdir(OUT_DIR);
  for (const file of existing) {
    if (file.endsWith(".yaml")) {
      await unlink(join(OUT_DIR, file));
    }
  }

  const files = (await readdir(DIALOGUE_DIR)).filter((f) => f.endsWith(".md"));
  if (files.length === 0) {
    console.warn("⚠ dialogue/*.md が見つかりません");
    return;
  }

  const episodes = [];
  for (const file of files) {
    const raw = await readFile(join(DIALOGUE_DIR, file), "utf-8");
    const { meta, body } = parseFrontmatter(raw);
    const sections = parseDialogue(body);
    episodes.push({ file, meta, sections });
  }

  episodes.sort((a, b) => {
    const da = a.meta.date || "";
    const db = b.meta.date || "";
    if (da !== db) return da.localeCompare(db);
    return a.file.localeCompare(b.file, "ja");
  });

  const generated = [];

  for (let i = 0; i < episodes.length; i++) {
    const ep = episodes[i];
    const scenes = [];

    const introLines = [
      {
        say: `[face:joy]${stripMarkdown(ep.meta.title || "無題")}`,
        speaker: "left",
        pauseSec: 0.25,
      },
    ];
    if (ep.meta.subtitle) {
      introLines.push({
        say: `[face:neutral]${stripMarkdown(ep.meta.subtitle)}`,
        speaker: "right",
        pauseSec: 0.2,
      });
    }
    if (ep.meta.date) {
      introLines.push({
        say: `[face:neutral]収録日 ${ep.meta.date}`,
        speaker: "left",
        pauseSec: 0.2,
      });
    }

    scenes.push({ id: "intro", lines: introLines });

    for (let sectionIndex = 0; sectionIndex < ep.sections.length; sectionIndex++) {
      const section = ep.sections[sectionIndex];
      scenes.push({
        id: `scene-${String(sectionIndex + 1).padStart(2, "0")}`,
        lines: toSceneLines(section),
      });
    }

    const titlePart = sanitizeFileName(ep.meta.title || stableSlug(ep.file)) || "episode";
    const outFile = `episode-${String(i + 1).padStart(2, "0")}-${titlePart}.yaml`;
    const yaml = renderYaml(ep.meta, scenes);
    await writeFile(join(OUT_DIR, outFile), yaml, "utf-8");
    generated.push(outFile);
  }

  console.log(`✓ ${generated.length} files generated in ${OUT_DIR}`);
  for (const file of generated) console.log(`  - ${file}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
