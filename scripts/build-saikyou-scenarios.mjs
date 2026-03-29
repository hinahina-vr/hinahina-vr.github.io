import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SCENARIO_DIR = join(ROOT, "scenarios");
const MAIN_MD_PATH = join(SCENARIO_DIR, "2026-03-26_最強のふたりの夢.md");
const MAIN_JSON_PATH = join(SCENARIO_DIR, "2026-03-26_最強のふたりの夢.json");

const SPEAKER_ALIASES = [
  { match: /みとら/, key: "mitra" },
  { match: /開高/, key: "kaiko" },
  { match: /佐治/, key: "saji" },
  { match: /ワディー/, key: "waddy" },
];

const MAIN_SCENE_SPECS = [
  { headingPrefix: "佐治の執務室", label: "saji_route" },
  { headingPrefix: "山崎蒸溜所", label: "saji_whisky" },
  { headingPrefix: "ブレンド室", label: "saji_blend" },
  { headingPrefix: "広告と流通", label: "saji_brand" },
  { headingPrefix: "サントリーホール", label: "saji_culture" },
  { headingPrefix: "美術館", label: "saji_art" },
  { headingPrefix: "開高の書斎", label: "kaiko_route" },
  { headingPrefix: "洋酒天国", label: "kaiko_youten" },
  { headingPrefix: "芥川賞受賞", label: "kaiko_akutagawa" },
  { headingPrefix: "ベトナム", label: "kaiko_vietnam" },
  { headingPrefix: "鬱", label: "kaiko_depression" },
  { headingPrefix: "旅の食卓", label: "kaiko_travel" },
  { headingPrefix: "合流：再会のバー", label: "reunion_bar" },
  { headingPrefix: "角瓶を注ぐ", label: "pour_whisky" },
  { headingPrefix: "言葉を注ぐ", label: "pour_words" },
];

const CHOICE_TEXT_SPECS = [
  { headingPrefix: "最初の選択肢", label: "choose_era" },
  { headingPrefix: "選択肢", label: "saji_route", occurrence: 1 },
  { headingPrefix: "選択肢", label: "saji_whisky", occurrence: 2 },
  { headingPrefix: "選択肢", label: "saji_blend", occurrence: 3 },
  { headingPrefix: "選択肢", label: "saji_brand", occurrence: 4 },
  { headingPrefix: "選択肢", label: "saji_culture", occurrence: 5 },
  { headingPrefix: "選択肢", label: "saji_art", occurrence: 6 },
  { headingPrefix: "選択肢", label: "kaiko_route", occurrence: 7 },
  { headingPrefix: "選択肢", label: "kaiko_youten", occurrence: 8 },
  { headingPrefix: "選択肢", label: "kaiko_akutagawa", occurrence: 9 },
  { headingPrefix: "選択肢", label: "kaiko_vietnam", occurrence: 10 },
  { headingPrefix: "選択肢", label: "kaiko_depression", occurrence: 11 },
  { headingPrefix: "選択肢", label: "kaiko_travel", occurrence: 12 },
  { headingPrefix: "選択肢", label: "reunion_bar", occurrence: 13 },
  { headingPrefix: "選択肢", label: "pour_whisky", occurrence: 14 },
  { headingPrefix: "選択肢", label: "pour_words", occurrence: 15 },
  { headingPrefix: "最終選択肢", label: "final_glass" },
];

const LOAD_LABELS_BY_SCENE = {
  saji_whisky: ["gen_cask_load", "gen_water_load"],
  saji_blend: ["gen_blend_load"],
  saji_brand: ["gen_torisuad_load", "gen_blank_minutes_load"],
  saji_art: ["gen_glasscase_load"],
  saji_culture: ["gen_hall_echo_load"],
  kaiko_youten: ["gen_youten_night_load"],
  kaiko_akutagawa: ["gen_waraji_load"],
  kaiko_vietnam: ["gen_bullet_load", "gen_map_load"],
  kaiko_depression: ["gen_silence_load"],
  kaiko_travel: ["gen_travel_table_load"],
  pour_whisky: ["gen_amber_deep_load"],
  pour_words: ["gen_unwritten_load"],
};

const ENDING_SPECS = [
  { headingPrefix: "END_YAMAZAKI", label: "END_YAMAZAKI" },
  { headingPrefix: "END_BLEND", label: "END_BLEND" },
  { headingPrefix: "END_HALL", label: "END_HALL" },
  { headingPrefix: "END_SILENCE", label: "END_SILENCE" },
  { headingPrefix: "END_WHITE", label: "END_WHITE" },
  { headingPrefix: "END_YOUTEN", label: "END_YOUTEN" },
  { headingPrefix: "END_WARAJI", label: "END_WARAJI" },
  { headingPrefix: "END_SAIGON", label: "END_SAIGON" },
  { headingPrefix: "END_SAIKYOU", label: "END_SAIKYOU" },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeLine(line) {
  return line.replace(/\r/g, "").trimEnd();
}

function compactText(text) {
  return text
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function stripMarkdownDecorations(text) {
  return text
    .replace(/^#+\s*/, "")
    .replace(/^\*\*(.+)\*\*$/, "$1")
    .replace(/^>\s?/, "")
    .trim();
}

function resolveSpeakerKey(label) {
  const raw = stripMarkdownDecorations(label);
  for (const entry of SPEAKER_ALIASES) {
    if (entry.match.test(raw)) {
      return entry.key;
    }
  }
  return "narrator";
}

function cleanExpression(text) {
  return text.replace(/^[（(]\s*/, "").replace(/\s*[）)]$/, "").trim();
}

function parseHeader(lines) {
  const titleLine = lines.find((line) => line.startsWith("# "));
  if (!titleLine) {
    throw new Error("タイトル行が見つかりません。");
  }

  const rawTitle = titleLine.replace(/^#\s+/, "").trim();
  const match = rawTitle.match(/^(.*?)\s+─\s*(.*?)\s*─?$/);
  const title = match ? match[1].trim() : rawTitle;
  const subtitle = match ? `─ ${match[2].trim()} ─` : "";

  const meta = {};
  for (const line of lines) {
    const metaMatch = line.match(/^- \*\*(.+?)\*\*: (.+)$/);
    if (metaMatch) {
      meta[metaMatch[1].trim()] = metaMatch[2].trim();
    }
  }

  return {
    title,
    subtitle,
    genre: meta["ジャンル"] || "",
    date: meta["日付"] || "",
    bgmTrack: (meta["BGM"] || "").split("（")[0].trim(),
  };
}

function collectHeadings(lines) {
  const headings = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = normalizeLine(lines[index]);
    const match = line.match(/^(#{2,4})\s+(.+)$/);
    if (!match) {
      continue;
    }
    headings.push({
      level: match[1].length,
      title: match[2].trim(),
      lineIndex: index,
    });
  }

  for (let index = 0; index < headings.length; index += 1) {
    const next = headings[index + 1];
    headings[index].bodyStart = headings[index].lineIndex + 1;
    headings[index].bodyEnd = next ? next.lineIndex : lines.length;
    headings[index].bodyLines = lines.slice(headings[index].bodyStart, headings[index].bodyEnd);
  }

  return headings;
}

function findHeading(headings, prefix, occurrence = 1) {
  let seen = 0;
  for (const heading of headings) {
    if (!heading.title.startsWith(prefix)) {
      continue;
    }
    seen += 1;
    if (seen === occurrence) {
      return heading;
    }
  }
  throw new Error(`見出し "${prefix}" (${occurrence}) が見つかりません。`);
}

function splitBySeparator(lines) {
  const groups = [];
  let current = [];

  for (const line of lines) {
    if (normalizeLine(line) === "---") {
      groups.push(current);
      current = [];
      continue;
    }
    current.push(line);
  }

  groups.push(current);
  return groups;
}

function parseChoiceTexts(lines) {
  return lines
    .map((line) => normalizeLine(line))
    .filter((line) => line.startsWith("- **"))
    .map((line) => {
      const match = line.match(/^- \*\*(.+?)\*\*/);
      if (!match) {
        throw new Error(`選択肢を解釈できません: ${line}`);
      }
      return match[1].trim();
    });
}

function extractEndingSummary(lines) {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = normalizeLine(lines[index]);
    if (!line) {
      continue;
    }
    const match = line.match(/^\*\*(.+)\*\*$/);
    if (!match) {
      return { summary: "", lines };
    }
    return {
      summary: match[1].trim(),
      lines: lines.slice(0, index).concat(lines.slice(index + 1)),
    };
  }
  return { summary: "", lines };
}

function parseSpeakerLead(line) {
  const match = normalizeLine(line).match(/^\*\*(.+?)\*\*(.*)$/);
  if (!match) {
    return null;
  }

  const rawLabel = match[1].trim();
  const remainder = match[2].trim();
  let expression = "";
  let inlineText = "";

  if (remainder.startsWith(">")) {
    inlineText = remainder.replace(/^>\s?/, "").trim();
  } else if (remainder) {
    expression = cleanExpression(remainder);
  }

  return {
    speaker: resolveSpeakerKey(rawLabel),
    expression,
    inlineText,
  };
}

function parseNarrativeSteps(lines) {
  const steps = [];
  let index = 0;

  while (index < lines.length) {
    const line = normalizeLine(lines[index]);

    if (
      !line ||
      line === "---" ||
      line.startsWith("- bg:") ||
      line.startsWith("- 入口:") ||
      line.startsWith("- **") ||
      line.startsWith("|")
    ) {
      index += 1;
      continue;
    }

    if (line.startsWith(">")) {
      const quoteLines = [];
      while (index < lines.length) {
        const current = normalizeLine(lines[index]);
        if (!current.startsWith(">")) {
          break;
        }
        quoteLines.push(current.replace(/^>\s?/, ""));
        index += 1;
      }
      steps.push({
        speaker: "narrator",
        expression: "",
        text: compactText(quoteLines.join("\n")),
      });
      continue;
    }

    const speakerLead = parseSpeakerLead(line);
    if (speakerLead) {
      index += 1;
      if (speakerLead.inlineText) {
        steps.push({
          speaker: speakerLead.speaker,
          expression: speakerLead.expression,
          text: compactText(speakerLead.inlineText),
        });
      }

      while (index < lines.length) {
        while (index < lines.length && !normalizeLine(lines[index])) {
          index += 1;
        }

        const quoteLines = [];
        while (index < lines.length) {
          const current = normalizeLine(lines[index]);
          if (!current) {
            break;
          }
          if (!current.startsWith(">")) {
            break;
          }
          quoteLines.push(current.replace(/^>\s?/, ""));
          index += 1;
        }

        if (!quoteLines.length) {
          break;
        }

        steps.push({
          speaker: speakerLead.speaker,
          expression: speakerLead.expression,
          text: compactText(quoteLines.join("\n")),
        });
      }

      continue;
    }

    const paragraph = [];
    while (index < lines.length) {
      const current = normalizeLine(lines[index]);
      if (
        !current ||
        current === "---" ||
        current.startsWith("- bg:") ||
        current.startsWith("- 入口:") ||
        current.startsWith("- **") ||
        current.startsWith("|") ||
        parseSpeakerLead(current)
      ) {
        break;
      }
      paragraph.push(current);
      index += 1;
    }

    if (paragraph.length) {
      steps.push({
        speaker: "narrator",
        expression: "",
        text: compactText(paragraph.join("\n")),
      });
      continue;
    }

    index += 1;
  }

  return steps.filter((step) => step.text);
}

function findLabelIndex(steps, label) {
  const index = steps.findIndex((step) => step.label === label);
  if (index < 0) {
    throw new Error(`ラベル ${label} が既存 JSON に見つかりません。`);
  }
  return index;
}

function buildChoicesFromExisting(existingScenario, label, texts) {
  const index = findLabelIndex(existingScenario, label);
  const choiceStep = existingScenario.slice(index).find((step) => Array.isArray(step.choices));
  if (!choiceStep) {
    throw new Error(`ラベル ${label} の choices が見つかりません。`);
  }
  if (choiceStep.choices.length !== texts.length) {
    throw new Error(
      `ラベル ${label} の選択肢数が一致しません。 expected=${choiceStep.choices.length} actual=${texts.length}`
    );
  }
  const cloned = clone(choiceStep);
  cloned.choices = cloned.choices.map((choice, idx) => ({
    ...choice,
    text: texts[idx],
  }));
  return cloned;
}

function copyFromLabelToFirstBg(existingScenario, label) {
  const result = [];
  const start = findLabelIndex(existingScenario, label);

  for (let index = start; index < existingScenario.length; index += 1) {
    const step = existingScenario[index];
    if (index > start && step.label) {
      break;
    }
    result.push(clone(step));
    if (step.bg || step.bgm) {
      break;
    }
  }

  return result;
}

function copyFromLabelToLoad(existingScenario, label) {
  const result = [];
  const start = findLabelIndex(existingScenario, label);

  for (let index = start; index < existingScenario.length; index += 1) {
    const step = existingScenario[index];
    if (index > start && step.label) {
      break;
    }
    result.push(clone(step));
    if (step.loadScenario) {
      return result;
    }
  }

  throw new Error(`ラベル ${label} の loadScenario が見つかりません。`);
}

function copyFromLabelUntilChoices(existingScenario, label) {
  const result = [];
  const start = findLabelIndex(existingScenario, label);

  for (let index = start; index < existingScenario.length; index += 1) {
    const step = existingScenario[index];
    if (index > start && step.label) {
      break;
    }
    if (Array.isArray(step.choices)) {
      break;
    }
    result.push(clone(step));
  }

  return result;
}

function copyControlSegment(existingScenario, label) {
  const start = findLabelIndex(existingScenario, label);
  const segment = [clone(existingScenario[start])];

  for (let index = start + 1; index < existingScenario.length; index += 1) {
    const step = existingScenario[index];
    if (step.label) {
      break;
    }
    segment.push(clone(step));
  }

  return segment;
}

function copyStructuralTail(existingScenario, label) {
  const start = findLabelIndex(existingScenario, label);
  const result = [];

  for (let index = start + 1; index < existingScenario.length; index += 1) {
    const step = existingScenario[index];
    if (step.label) {
      break;
    }
    if (step.speaker || step.text || step.bg || step.bgm || step.flag) {
      continue;
    }
    result.push(clone(step));
  }

  return result;
}

function inferDefaultBgm(existingDefinition, header) {
  const base = existingDefinition?.defaultBgm
    ? clone(existingDefinition.defaultBgm)
    : { src: "", volume: 0.08, loop: true };

  if (header.bgmTrack) {
    base.src = `./assets/bgm/${header.bgmTrack}`;
  }
  if (typeof base.volume !== "number") {
    base.volume = 0.08;
  }
  if (typeof base.loop !== "boolean") {
    base.loop = true;
  }

  return base;
}

function buildChoiceTextMap(headings) {
  const map = new Map();
  for (const spec of CHOICE_TEXT_SPECS) {
    const heading = findHeading(headings, spec.headingPrefix, spec.occurrence || 1);
    map.set(spec.label, parseChoiceTexts(heading.bodyLines));
  }
  return map;
}

function buildMainScenario(headings, existingMain, header) {
  const choiceTextsByLabel = buildChoiceTextMap(headings);
  const scenario = [];

  const prologueHeading = findHeading(headings, "プロローグ");
  const [introPart1, introPart2] = splitBySeparator(prologueHeading.bodyLines);

  scenario.push(...copyFromLabelToFirstBg(existingMain.scenario, "standalone_start"));
  scenario.push(...parseNarrativeSteps(introPart1));
  scenario.push(...copyFromLabelToFirstBg(existingMain.scenario, "book_close"));
  scenario.push(...parseNarrativeSteps(introPart2));
  scenario.push({ label: "choose_era" });
  scenario.push(buildChoicesFromExisting(existingMain.scenario, "choose_era", choiceTextsByLabel.get("choose_era")));

  for (const spec of MAIN_SCENE_SPECS) {
    const heading = findHeading(headings, spec.headingPrefix);
    scenario.push(...copyFromLabelToFirstBg(existingMain.scenario, spec.label));
    scenario.push(...parseNarrativeSteps(heading.bodyLines));

    const choiceTexts = choiceTextsByLabel.get(spec.label);
    if (choiceTexts) {
      scenario.push(buildChoicesFromExisting(existingMain.scenario, spec.label, choiceTexts));
    }

    for (const loadLabel of LOAD_LABELS_BY_SCENE[spec.label] || []) {
      scenario.push(...copyFromLabelToLoad(existingMain.scenario, loadLabel));
    }
  }

  const mitraHeading = findHeading(headings, "みとらのテーブル");
  scenario.push(...copyFromLabelToFirstBg(existingMain.scenario, "mitra_table"));
  scenario.push(...parseNarrativeSteps(mitraHeading.bodyLines));
  scenario.push(...copyStructuralTail(existingMain.scenario, "mitra_table"));
  scenario.push(...copyControlSegment(existingMain.scenario, "mitra_check_kaiko"));
  scenario.push(...copyControlSegment(existingMain.scenario, "mitra_unlock_saikyou"));
  scenario.push(...copyFromLabelUntilChoices(existingMain.scenario, "final_glass"));
  scenario.push(buildChoicesFromExisting(existingMain.scenario, "final_glass", choiceTextsByLabel.get("final_glass")));

  for (const spec of ENDING_SPECS) {
    const heading = findHeading(headings, spec.headingPrefix);
    const { summary, lines } = extractEndingSummary(heading.bodyLines);
    const existingEnding = existingMain.scenario
      .slice(findLabelIndex(existingMain.scenario, spec.label))
      .find((step) => step.ending)?.ending;

    scenario.push(...copyFromLabelToFirstBg(existingMain.scenario, spec.label));
    scenario.push(...parseNarrativeSteps(lines));
    scenario.push({
      ending: {
        title: existingEnding?.title || spec.label,
        subtitle: summary || existingEnding?.subtitle || "",
      },
    });
  }

  return {
    title: header.title,
    subtitle: header.subtitle || existingMain.subtitle,
    genre: header.genre || existingMain.genre,
    date: header.date || existingMain.date,
    defaultBgm: inferDefaultBgm(existingMain, header),
    chars: clone(existingMain.chars),
    scenario,
  };
}

function buildSubScenario(existingDefinition, title, bodyLines, header) {
  const bgLine = bodyLines.find((line) => normalizeLine(line).startsWith("- bg:"));
  const bg =
    bgLine?.replace(/^- bg:\s*/, "").trim() ||
    existingDefinition?.scenario?.find((step) => step.bg)?.bg ||
    "book_pages";
  const { summary, lines } = extractEndingSummary(bodyLines);
  const steps = parseNarrativeSteps(lines);
  const existingEnding = existingDefinition?.scenario?.find((step) => step.ending)?.ending;

  return {
    title,
    subtitle: existingDefinition?.subtitle || `─ ${title} ─`,
    genre: existingDefinition?.genre || "幻界ノベル",
    date: header.date || existingDefinition?.date || "2026-03-26",
    defaultBgm: inferDefaultBgm(existingDefinition, header),
    chars: clone(existingDefinition?.chars || {}),
    scenario: [
      { label: "standalone_start" },
      { label: "entry_from_main" },
      {
        bg,
        bgm: inferDefaultBgm(existingDefinition, header),
      },
      ...steps,
      {
        ending: {
          title,
          subtitle: summary || existingEnding?.subtitle || title,
        },
      },
    ],
  };
}

async function main() {
  const markdown = await readFile(MAIN_MD_PATH, "utf8");
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const header = parseHeader(lines);
  const headings = collectHeadings(lines);
  const existingMain = JSON.parse(await readFile(MAIN_JSON_PATH, "utf8"));

  const nextMain = buildMainScenario(headings, existingMain, header);
  await writeFile(MAIN_JSON_PATH, `${JSON.stringify(nextMain, null, 2)}\n`, "utf8");

  const subRootHeading = findHeading(headings, "幻界サブシナリオ");
  const subHeadings = headings.filter(
    (heading) => heading.lineIndex > subRootHeading.lineIndex && heading.title.startsWith("★")
  );

  for (const heading of subHeadings) {
    const title = heading.title.replace(/^★\d+\.\s*/, "").trim();
    const filePath = join(SCENARIO_DIR, `${header.date}_${title}.json`);
    const existing = JSON.parse(await readFile(filePath, "utf8"));
    const next = buildSubScenario(existing, title, heading.bodyLines, header);
    await writeFile(filePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  }

  console.log(`✓ Generated main scenario from ${MAIN_MD_PATH}`);
  console.log(`✓ Updated ${subHeadings.length} sub-scenarios`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
