/**
 * generate-diary-covers.mjs
 *
 * Main diary の扉絵アセットを生成する。
 * OPENAI_API_KEY がある場合は GPT Image 1.5 を使い、
 * ない場合は同じ prompt 情報から SVG のテスト用カバーを出力する。
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import { stripDailyContextBlock } from "./lib/daily-context.mjs";

const ROOT_DIR = join(import.meta.dirname, "..");
const DIARY_DIR = join(ROOT_DIR, "diary");
const COVER_DIR = join(ROOT_DIR, "assets", "diary-covers");
const MANIFEST_PATH = join(COVER_DIR, "manifest.json");
const IMAGE_MODEL = "gpt-image-1.5";

const ENTRY_OVERRIDES = {
  "2026-04-13_爆発の手前で配線を信じる": {
    motif: "wires",
    palette: {
      bg0: "#060a18",
      bg1: "#24113f",
      bg2: "#4b1c63",
      accent: "#7cf5ff",
      accentSoft: "#3bb7ff",
      hot: "#ff7f6a",
      gold: "#ffd280",
    },
    prompt:
      "A moody literary cover illustration for a Japanese diary entry. Midnight electronics workbench, glowing breadboard wires, tiny sparks, cautious tension before failure, subtle cherry blossom shadows drifting in the dark, analog realism with dreamy neon highlights, no text, cinematic, richly detailed.",
  },
  "2026-04-14_画面越しでも場は動く": {
    motif: "stage",
    palette: {
      bg0: "#071123",
      bg1: "#10254a",
      bg2: "#1c4772",
      accent: "#8fe7ff",
      accentSoft: "#65bfff",
      hot: "#ffd39a",
      gold: "#ffe7b7",
    },
    prompt:
      "A cover illustration for a reflective Japanese diary entry about a charismatic online lecture. A luminous screen in a dark room, a single speaker commanding the atmosphere through rhythm and gesture, data motifs and audience attention lines converging toward the screen, elegant, cinematic, human warmth stronger than pure technology, no text.",
  },
  "2026-04-15_入門書が死んでも温まるまで待つ": {
    motif: "bookheat",
    palette: {
      bg0: "#0a0714",
      bg1: "#281539",
      bg2: "#513057",
      accent: "#9ce7ff",
      accentSoft: "#73c2ff",
      hot: "#ffb36d",
      gold: "#ffe39b",
    },
    prompt:
      "A literary tech cover illustration. A small OLED alcohol meter demo on a desk, warm sensor glow, patient waiting, tiny status labels like a playful human mood scale implied without readable text, old guidebooks fading into the background while real heat and voltage remain stubbornly physical, warm amber against cool midnight purple, no text.",
  },
  "2026-04-16_シラフのまま3.3Vに降りる": {
    motif: "divider",
    palette: {
      bg0: "#060814",
      bg1: "#101c3a",
      bg2: "#1b2f60",
      accent: "#8de5ff",
      accentSoft: "#4fb5ff",
      hot: "#ff7bb2",
      gold: "#ffe28d",
    },
    prompt:
      "A poetic engineering cover illustration about reducing 5V to 3.3V before an alcohol sensing project can begin. Cool blue voltage bars descending in steps, sober restraint, tiny resistor forms, precise circuitry, a feeling of wanting intoxication while reality demands careful calibration first, minimalist but atmospheric, no text.",
  },
  "2026-04-17_科目名にまだ朝を足していく": {
    motif: "catalog",
    palette: {
      bg0: "#06101b",
      bg1: "#12354d",
      bg2: "#275d74",
      accent: "#b8f3ff",
      accentSoft: "#7fe7d2",
      hot: "#ffc785",
      gold: "#fff0b0",
    },
    prompt:
      "A cover illustration for a diary entry about turning dry course titles into dreamlike entrances. Floating academic cards transforming into dawn-lit doors, catalog pages becoming pathways, orderly lists gaining warmth and atmosphere, a hint of theatrical music in the air, morning light inside a structured archive, no text.",
  },
  "2026-04-18_3000万円の余白": {
    motif: "wealth",
    palette: {
      bg0: "#090910",
      bg1: "#1d2134",
      bg2: "#2e334c",
      accent: "#c0d8ff",
      accentSoft: "#8eb7ff",
      hot: "#ff8a6b",
      gold: "#ffd978",
    },
    prompt:
      "A contemplative cover illustration for a Japanese diary entry about liquid assets passing thirty million yen. Calm stacked financial forms, a steady core holding noisy speculative sparks at the edges, city-night elegance, restrained wealth, and a thin reckless neon line hinting at ruin temptation, no text, cinematic and reflective.",
  },
};

function parseArgs(argv) {
  const result = {
    dateFrom: null,
    dateTo: null,
    force: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--date-from") {
      result.dateFrom = argv[i + 1] ?? null;
      i += 1;
    } else if (arg === "--date-to") {
      result.dateTo = argv[i + 1] ?? null;
      i += 1;
    } else if (arg === "--force") {
      result.force = true;
    }
  }

  return result;
}

function parseFilename(filename) {
  const base = basename(filename, ".md");
  const match = base.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/);
  if (!match) return null;
  return { slug: base, date: match[1], title: match[2] };
}

function isWithinRange(date, dateFrom, dateTo) {
  if (dateFrom && date < dateFrom) return false;
  if (dateTo && date > dateTo) return false;
  return true;
}

function cleanBody(raw) {
  const cleaned = stripDailyContextBlock(raw);
  return cleaned.replace(/^\uFEFF?/, "").replace(/^#[^\r\n]+[\r\n]+/, "").trim();
}

function summarizeBody(body) {
  return body
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function slugCandidates(slug) {
  return [".webp", ".png", ".jpg", ".jpeg", ".svg"].map((ext) => join(COVER_DIR, `${slug}${ext}`));
}

function pickGenericMotif(entry, body) {
  const haystack = `${entry.title}\n${body}`;
  if (/(電圧|分圧|3\.3V|5V|シラフ|しらふ)/.test(haystack)) return "divider";
  if (/(講義|授業|科目|一覧|カタログ|朝)/.test(haystack)) return "catalog";
  if (/(資産|三千万|投資|破滅|野毛)/.test(haystack)) return "wealth";
  if (/(液晶|OLED|MQ-3|温ま|入門書)/.test(haystack)) return "bookheat";
  if (/(ライブ|画面越し|プレゼン|授業)/.test(haystack)) return "stage";
  if (/(配線|爆発|ブレッドボード|マイコン)/.test(haystack)) return "wires";
  return "generic";
}

function defaultPalette(motif) {
  const palettes = {
    wires: {
      bg0: "#070b16",
      bg1: "#22133b",
      bg2: "#45215d",
      accent: "#8ff1ff",
      accentSoft: "#4cb6ff",
      hot: "#ff7d68",
      gold: "#ffd37f",
    },
    stage: {
      bg0: "#09111f",
      bg1: "#17304c",
      bg2: "#275e7c",
      accent: "#9ceeff",
      accentSoft: "#77cbff",
      hot: "#ffd1a0",
      gold: "#fff0b2",
    },
    bookheat: {
      bg0: "#0b0816",
      bg1: "#2b1839",
      bg2: "#5a315d",
      accent: "#9ce7ff",
      accentSoft: "#7bc8ff",
      hot: "#ffb06e",
      gold: "#ffe2a5",
    },
    divider: {
      bg0: "#070913",
      bg1: "#122142",
      bg2: "#24408a",
      accent: "#92e7ff",
      accentSoft: "#56b9ff",
      hot: "#ff86c0",
      gold: "#ffe08f",
    },
    catalog: {
      bg0: "#06101a",
      bg1: "#18354c",
      bg2: "#35697d",
      accent: "#b8f3ff",
      accentSoft: "#86ebdb",
      hot: "#ffca88",
      gold: "#fff2b5",
    },
    wealth: {
      bg0: "#09090f",
      bg1: "#22263a",
      bg2: "#3e455a",
      accent: "#c9ddff",
      accentSoft: "#96bafc",
      hot: "#ff8f6f",
      gold: "#ffdd82",
    },
    generic: {
      bg0: "#090d18",
      bg1: "#1f2940",
      bg2: "#3f4b66",
      accent: "#c8e7ff",
      accentSoft: "#7fc4ff",
      hot: "#ff9b72",
      gold: "#ffe19a",
    },
  };

  return palettes[motif] ?? palettes.generic;
}

function buildCreativeDirection(entry, body) {
  const override = ENTRY_OVERRIDES[entry.slug];
  if (override) {
    return {
      motif: override.motif,
      palette: override.palette,
      prompt: override.prompt,
    };
  }

  const motif = pickGenericMotif(entry, body);
  const palette = defaultPalette(motif);
  const summary = summarizeBody(body);
  return {
    motif,
    palette,
    prompt: [
      "A literary Japanese diary cover illustration, no text.",
      `Title mood: ${entry.title}.`,
      `Summary: ${summary}.`,
      "Create a cinematic scene with strong atmosphere, restrained symbolism, and a handcrafted retro-web warmth.",
    ].join(" "),
  };
}

function polygon(points, fill, opacity = 1) {
  return `<polygon points="${points}" fill="${fill}" opacity="${opacity}" />`;
}

function circle(cx, cy, r, fill, opacity = 1) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" opacity="${opacity}" />`;
}

function rect(x, y, width, height, fill, opacity = 1, radius = 0, stroke = null, strokeOpacity = 1) {
  const strokeAttr = stroke ? ` stroke="${stroke}" stroke-opacity="${strokeOpacity}"` : "";
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" opacity="${opacity}"${strokeAttr} />`;
}

function path(d, stroke, strokeWidth, opacity = 1, extra = "") {
  return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" ${extra} />`;
}

function line(x1, y1, x2, y2, stroke, strokeWidth, opacity = 1) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" />`;
}

function renderWires(palette) {
  return [
    rect(130, 180, 1276, 664, "rgba(4, 11, 22, 0.34)", 1, 42, palette.accentSoft, 0.22),
    path("M 220 620 C 420 500 540 700 750 560 S 1040 360 1300 510", palette.accent, 10, 0.75, 'stroke-linecap="round"'),
    path("M 210 420 C 430 310 540 530 760 420 S 1100 190 1320 330", palette.accentSoft, 7, 0.7, 'stroke-linecap="round"'),
    path("M 260 760 C 470 640 680 740 850 650 S 1150 520 1280 610", palette.hot, 5, 0.7, 'stroke-linecap="round"'),
    circle(250, 620, 22, palette.gold, 0.8),
    circle(744, 562, 18, palette.accent, 0.88),
    circle(1294, 507, 20, palette.hot, 0.86),
    circle(214, 420, 16, palette.accentSoft, 0.85),
    circle(764, 421, 14, palette.gold, 0.75),
    polygon("1160,228 1200,196 1238,232 1212,278 1166,268", palette.hot, 0.22),
    polygon("1110,272 1144,240 1186,278 1160,316 1118,304", palette.gold, 0.18),
    polygon("1060,232 1096,202 1132,236 1114,274 1072,268", "#ffd7eb", 0.14),
    rect(408, 316, 220, 132, "rgba(255,255,255,0.06)", 1, 16, palette.gold, 0.2),
    rect(448, 346, 22, 72, palette.gold, 0.8, 8),
    rect(488, 334, 22, 84, palette.accent, 0.72, 8),
    rect(528, 356, 22, 62, palette.hot, 0.76, 8),
  ].join("\n");
}

function renderStage(palette) {
  return [
    rect(248, 172, 1040, 612, "rgba(255,255,255,0.04)", 1, 36, palette.accentSoft, 0.22),
    rect(320, 214, 896, 456, "rgba(10,18,26,0.7)", 1, 30, palette.accent, 0.18),
    rect(356, 250, 824, 384, "rgba(116, 215, 255, 0.08)", 1, 26),
    polygon("536,610 1000,610 906,402 640,402", palette.hot, 0.14),
    circle(768, 398, 110, palette.gold, 0.18),
    path("M 356 634 C 514 560 628 534 768 530 S 1026 558 1180 634", palette.accent, 3, 0.55),
    path("M 430 692 C 560 612 662 588 768 584 S 972 616 1106 696", palette.accentSoft, 2, 0.5),
    circle(522, 772, 46, "rgba(255,255,255,0.08)", 1),
    circle(664, 804, 60, "rgba(255,255,255,0.08)", 1),
    circle(850, 810, 58, "rgba(255,255,255,0.08)", 1),
    circle(1016, 776, 44, "rgba(255,255,255,0.08)", 1),
    line(428, 300, 1110, 300, palette.gold, 1.4, 0.5),
    line(428, 360, 1110, 360, palette.gold, 1.4, 0.4),
    line(428, 420, 1110, 420, palette.gold, 1.4, 0.35),
  ].join("\n");
}

function renderBookHeat(palette) {
  return [
    rect(200, 214, 1138, 592, "rgba(255,255,255,0.04)", 1, 38, palette.accentSoft, 0.18),
    rect(280, 492, 404, 224, "rgba(255,255,255,0.06)", 1, 22, palette.gold, 0.14),
    rect(326, 452, 404, 224, "rgba(255,255,255,0.08)", 1, 22, palette.hot, 0.16),
    rect(830, 278, 330, 440, "rgba(9,16,28,0.74)", 1, 28, palette.accent, 0.2),
    rect(874, 330, 242, 192, "rgba(120, 240, 255, 0.1)", 1, 18, palette.accentSoft, 0.22),
    rect(908, 566, 172, 28, palette.gold, 0.8, 14),
    rect(908, 608, 140, 24, palette.accent, 0.76, 12),
    rect(908, 646, 192, 24, palette.hot, 0.7, 12),
    circle(992, 426, 110, palette.hot, 0.13),
    circle(1016, 426, 86, palette.gold, 0.22),
    line(484, 484, 484, 660, palette.gold, 2, 0.42),
    line(538, 484, 538, 660, palette.gold, 2, 0.26),
    path("M 978 242 C 930 310 930 380 978 446", palette.hot, 5, 0.58, 'stroke-linecap="round"'),
    path("M 1036 244 C 990 322 992 394 1036 472", palette.gold, 4, 0.48, 'stroke-linecap="round"'),
  ].join("\n");
}

function renderDivider(palette) {
  return [
    rect(182, 202, 1172, 620, "rgba(255,255,255,0.03)", 1, 36, palette.accentSoft, 0.16),
    polygon("292,726 548,320 690,320 436,726", palette.accentSoft, 0.26),
    polygon("640,726 838,254 964,254 760,726", palette.accent, 0.28),
    polygon("968,726 1138,378 1240,378 1080,726", palette.hot, 0.24),
    rect(324, 764, 202, 22, palette.gold, 0.7, 11),
    rect(678, 764, 202, 22, palette.accent, 0.75, 11),
    rect(1012, 764, 152, 22, palette.hot, 0.72, 11),
    rect(612, 286, 104, 244, "rgba(255,255,255,0.08)", 1, 18, palette.gold, 0.18),
    rect(648, 322, 32, 50, palette.gold, 0.82, 10),
    rect(648, 390, 32, 50, palette.accent, 0.8, 10),
    rect(648, 458, 32, 36, palette.hot, 0.78, 10),
    line(230, 730, 1300, 730, palette.accent, 2, 0.26),
    line(230, 774, 1300, 774, palette.accentSoft, 1, 0.22),
  ].join("\n");
}

function renderCatalog(palette) {
  return [
    rect(202, 166, 1132, 654, "rgba(255,255,255,0.03)", 1, 40, palette.accentSoft, 0.16),
    polygon("768,126 1108,768 428,768", "rgba(255, 219, 142, 0.14)", 1),
    rect(286, 310, 290, 180, "rgba(255,255,255,0.08)", 1, 22, palette.gold, 0.16),
    rect(610, 242, 320, 208, "rgba(255,255,255,0.08)", 1, 22, palette.accent, 0.16),
    rect(930, 376, 248, 168, "rgba(255,255,255,0.08)", 1, 22, palette.accentSoft, 0.14),
    rect(428, 520, 260, 170, "rgba(255,255,255,0.08)", 1, 22, palette.hot, 0.14),
    rect(744, 520, 252, 170, "rgba(255,255,255,0.08)", 1, 22, palette.gold, 0.12),
    line(320, 356, 516, 356, palette.gold, 10, 0.42),
    line(320, 394, 486, 394, palette.gold, 10, 0.3),
    line(648, 292, 884, 292, palette.accent, 12, 0.46),
    line(648, 338, 840, 338, palette.accent, 10, 0.3),
    line(952, 414, 1122, 414, palette.accentSoft, 10, 0.32),
    line(952, 452, 1088, 452, palette.accentSoft, 10, 0.25),
  ].join("\n");
}

function renderWealth(palette) {
  return [
    rect(196, 188, 1144, 636, "rgba(255,255,255,0.03)", 1, 40, palette.accentSoft, 0.12),
    rect(318, 602, 204, 122, "rgba(255,255,255,0.08)", 1, 18, palette.gold, 0.16),
    rect(560, 510, 204, 214, "rgba(255,255,255,0.08)", 1, 18, palette.gold, 0.18),
    rect(802, 398, 204, 326, "rgba(255,255,255,0.08)", 1, 18, palette.gold, 0.22),
    rect(1044, 330, 150, 394, "rgba(255,255,255,0.08)", 1, 18, palette.gold, 0.16),
    circle(304, 286, 86, palette.hot, 0.12),
    circle(1190, 280, 90, palette.accentSoft, 0.1),
    path("M 1096 198 C 1160 234 1194 268 1230 338 C 1168 372 1130 420 1106 474", palette.hot, 5, 0.54, 'stroke-linecap="round"'),
    path("M 1140 184 C 1194 224 1230 260 1260 326", palette.gold, 3, 0.45, 'stroke-linecap="round"'),
    line(300, 762, 1220, 762, palette.accent, 1.6, 0.3),
    line(300, 790, 1220, 790, palette.accentSoft, 1, 0.2),
  ].join("\n");
}

function renderGeneric(palette) {
  return [
    rect(210, 210, 1116, 604, "rgba(255,255,255,0.04)", 1, 38, palette.accentSoft, 0.16),
    circle(460, 378, 166, palette.hot, 0.1),
    circle(1010, 364, 184, palette.accent, 0.12),
    polygon("768,208 1124,786 410,786", palette.gold, 0.08),
  ].join("\n");
}

function renderMotif(motif, palette) {
  const renderers = {
    wires: renderWires,
    stage: renderStage,
    bookheat: renderBookHeat,
    divider: renderDivider,
    catalog: renderCatalog,
    wealth: renderWealth,
    generic: renderGeneric,
  };
  const renderer = renderers[motif] ?? renderGeneric;
  return renderer(palette);
}

function renderFallbackSvg(entry, creative) {
  const { palette, motif } = creative;
  const summary = summarizeBody(entry.body);
  const safeTitle = entry.title
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  const safeDate = entry.date
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  const safeSummary = summary
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

  const motifSvg = renderMotif(motif, palette);

  const scanlines = Array.from({ length: 10 }, (_, index) => {
    const y = 164 + index * 72;
    const opacity = index % 2 === 0 ? 0.08 : 0.04;
    return line(170, y, 1366, y, "rgba(255,255,255,0.22)", 1, opacity);
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024" role="img" aria-labelledby="title desc">
  <title id="title">${safeTitle}</title>
  <desc id="desc">${safeSummary}</desc>
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.bg0}" />
      <stop offset="52%" stop-color="${palette.bg1}" />
      <stop offset="100%" stop-color="${palette.bg2}" />
    </linearGradient>
    <radialGradient id="glowA" cx="26%" cy="26%" r="54%">
      <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.22" />
      <stop offset="100%" stop-color="${palette.accent}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="glowB" cx="78%" cy="28%" r="48%">
      <stop offset="0%" stop-color="${palette.hot}" stop-opacity="0.18" />
      <stop offset="100%" stop-color="${palette.hot}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="glowC" cx="50%" cy="100%" r="56%">
      <stop offset="0%" stop-color="${palette.gold}" stop-opacity="0.18" />
      <stop offset="100%" stop-color="${palette.gold}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="1536" height="1024" fill="url(#bg)" />
  <rect width="1536" height="1024" fill="url(#glowA)" />
  <rect width="1536" height="1024" fill="url(#glowB)" />
  <rect width="1536" height="1024" fill="url(#glowC)" />
  <rect x="58" y="58" width="1420" height="908" rx="40" fill="rgba(2, 6, 18, 0.28)" stroke="rgba(255,255,255,0.08)" />
  <g>
${scanlines}
  </g>
  <g>
${motifSvg}
  </g>
  <g opacity="0.72">
    <text x="156" y="162" fill="rgba(255,255,255,0.7)" font-size="28" font-family="'Trebuchet MS', 'Yu Gothic', sans-serif" letter-spacing="8">${safeDate}</text>
    <text x="156" y="906" fill="rgba(255,255,255,0.88)" font-size="72" font-weight="700" font-family="'Trebuchet MS', 'Yu Gothic', sans-serif">${safeTitle}</text>
    <text x="156" y="950" fill="rgba(255,255,255,0.54)" font-size="24" font-family="'Trebuchet MS', 'Yu Gothic', sans-serif">${safeSummary}</text>
  </g>
</svg>
`;
}

async function generateWithOpenAi(entry, creative, outputPath) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const endpointBase = (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  if (process.env.OPENAI_ORG_ID?.trim()) {
    headers["OpenAI-Organization"] = process.env.OPENAI_ORG_ID.trim();
  }
  if (process.env.OPENAI_PROJECT?.trim()) {
    headers["OpenAI-Project"] = process.env.OPENAI_PROJECT.trim();
  }

  const response = await fetch(`${endpointBase}/images/generations`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt: creative.prompt,
      size: "1536x1024",
      quality: "medium",
      output_format: "png",
      background: "opaque",
    }),
  });

  const payloadText = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(payloadText);
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const errorMessage = payload?.error?.message ?? payloadText;
    throw new Error(errorMessage);
  }

  const imageBase64 = payload?.data?.[0]?.b64_json ?? null;
  if (!imageBase64) {
    throw new Error("Image API returned no b64_json payload.");
  }

  await writeFile(outputPath, Buffer.from(imageBase64, "base64"));
  return {
    coverSrc: `./assets/diary-covers/${basename(outputPath)}`,
    renderMode: "openai-images-api",
    modelUsed: IMAGE_MODEL,
  };
}

async function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    return {
      version: 1,
      requestedModel: IMAGE_MODEL,
      generatedAt: null,
      entries: {},
    };
  }

  const raw = await readFile(MANIFEST_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  return {
    version: 1,
    requestedModel: IMAGE_MODEL,
    generatedAt: parsed.generatedAt ?? null,
    entries: parsed.entries ?? {},
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await mkdir(COVER_DIR, { recursive: true });

  const manifest = await loadManifest();
  const files = (await readdir(DIARY_DIR))
    .filter((file) => file.endsWith(".md"))
    .map((file) => parseFilename(file))
    .filter(Boolean)
    .filter((entry) => isWithinRange(entry.date, options.dateFrom, options.dateTo))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (files.length === 0) {
    console.log("No diary entries matched the requested range.");
    return;
  }

  for (const entryMeta of files) {
    const raw = await readFile(join(DIARY_DIR, `${entryMeta.slug}.md`), "utf-8");
    const body = cleanBody(raw);
    const entry = { ...entryMeta, body };
    const creative = buildCreativeDirection(entry, body);

    const existingAssets = slugCandidates(entry.slug);
    const hasExistingAsset = existingAssets.some((assetPath) => existsSync(assetPath));
    if (hasExistingAsset && !options.force) {
      console.log(`skip ${entry.slug}: cover already exists`);
      continue;
    }

    const pngPath = join(COVER_DIR, `${entry.slug}.png`);
    const svgPath = join(COVER_DIR, `${entry.slug}.svg`);

    let result = null;
    let generationError = null;
    try {
      result = await generateWithOpenAi(entry, creative, pngPath);
    } catch (error) {
      generationError = error instanceof Error ? error.message : String(error);
    }

    if (!result) {
      const svg = renderFallbackSvg(entry, creative);
      await writeFile(svgPath, svg, "utf-8");
      result = {
        coverSrc: `./assets/diary-covers/${basename(svgPath)}`,
        renderMode: "fallback-svg",
        modelUsed: IMAGE_MODEL,
      };
      if (generationError) {
        console.warn(`fallback ${entry.slug}: ${generationError}`);
      } else if (!process.env.OPENAI_API_KEY?.trim()) {
        console.warn(`fallback ${entry.slug}: OPENAI_API_KEY is not set`);
      }
    }

    manifest.entries[entry.slug] = {
      slug: entry.slug,
      date: entry.date,
      title: entry.title,
      coverSrc: result.coverSrc,
      renderMode: result.renderMode,
      modelUsed: result.modelUsed,
      prompt: creative.prompt,
      summary: summarizeBody(body),
      updatedAt: new Date().toISOString(),
    };

    console.log(`generated ${entry.slug}: ${result.coverSrc}`);
  }

  manifest.generatedAt = new Date().toISOString();
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
