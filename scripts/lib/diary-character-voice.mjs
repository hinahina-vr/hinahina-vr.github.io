import fs from "node:fs";
import path from "node:path";
import { splitDiaryMarkdown } from "./diary-self-date.mjs";

export const repoRoot = path.resolve(import.meta.dirname, "..", "..");

const DIARY_FILE_RE = /^(\d{4}-\d{2}-\d{2})_.+\.md$/;

function rx(source, flags = "") {
  return new RegExp(source, flags);
}

export const CHARACTER_VOICE_RULES = {
  "diary-hinahina": {
    label: "ひなひな",
    groups: [
      { label: "ひなひなの遊び人ボイス", patterns: ["ホーン", "エーヤオ", "ワディー", "ねえ"] },
      { label: "アバター/ワールド系モチーフ", patterns: ["アバター", "ワールド", "VRChat", "鏡", "外に置く"] },
    ],
  },
  "diary-ruriko": {
    label: "瑠璃子",
    groups: [
      { label: "瑠璃子の短文電波口調", patterns: ["……", "電波", "届いた", "ワディーちゃん"] },
      { label: "信号/画面/受信モチーフ", patterns: ["信号", "受信", "送信", "640x480", "画面", "回路"] },
    ],
  },
  "diary-mint": {
    label: "ミント",
    groups: [
      { label: "ミントのお嬢様口調", patterns: ["わたくし", "ですわ", "ですの", "ワディーさん"] },
      { label: "テレパス/駄菓子/計算モチーフ", patterns: ["テレパ", "駄菓子", "計算", "糖分", "本音"] },
    ],
  },
  "diary-minagi": {
    label: "美凪",
    groups: [
      { label: "美凪の静かな間", patterns: ["……", "ワディーさん", "そうですか", "たぶん"] },
      { label: "星/翼/お米券モチーフ", patterns: ["星", "翼", "お米券", "光", "飛"] },
    ],
  },
  "diary-mii": {
    label: "みぃ",
    groups: [
      { label: "みぃタンの呼び方・語尾", patterns: ["みぃタン", "お兄タン", "なの", "くすくす"] },
      { label: "魔法/たんぽぽモチーフ", patterns: ["魔法", "たんぽぽ", "ぴかぴか", "咲く"] },
    ],
  },
  "diary-kukuri": {
    label: "ククリ",
    groups: [
      { label: "ククリのやわらかい魔法口調", patterns: ["ワディーさん", "よぉ", "なの", "勇者様"] },
      { label: "グルグル/魔法陣モチーフ", patterns: ["グルグル", "魔法陣", "冒険", "ガッツでファイト"] },
    ],
  },
  "diary-hinako": {
    label: "ヒナ",
    groups: [
      { label: "ヒナの幼い呼び方・語尾", patterns: ["ヒナ", "おにいたま", "なのー", "くしし"] },
      { label: "クマさん/絵本モチーフ", patterns: ["クマさん", "えほん", "だいじ", "ぎゅ"] },
    ],
  },
  "diary-rizel": {
    label: "りぜる",
    groups: [
      { label: "りぜるのだんなさま口調", patterns: ["だんなさま", "りぜる", "ですぅ", "です"] },
      { label: "人造人間/お嫁さんモチーフ", patterns: ["人造人間", "お嫁さん", "本物", "そばにいたい"] },
    ],
  },
  "diary-nemurin": {
    label: "ねむりん",
    groups: [
      { label: "ねむりんの眠い口調", patterns: ["ねむりん", "よぉ", "zzz", "ふわぁ", "おやすみ"] },
      { label: "夢/眠りモチーフ", patterns: ["夢", "眠", "地図", "預かれる"] },
    ],
  },
  "diary-rem": {
    label: "レム",
    groups: [
      { label: "レムの丁寧な献身口調", patterns: ["レム", "ワディーさん", "お申し付けください", "お役目"] },
      { label: "メイド/部屋/お茶モチーフ", patterns: ["メイド", "お茶", "お部屋", "毛布", "整え"] },
    ],
  },
  "diary-ecoko": {
    label: "えここ",
    groups: [
      { label: "えここ本人の呼び名・CM感", patterns: ["えここ", "えっこあいす", "ワディーさん"] },
      { label: "省エネ/氷/ペンギン系モチーフ", patterns: ["省エネ", "電気", "待機電力", "ペンギン", "氷", "保冷"] },
    ],
  },
  "diary-tsumugi": {
    label: "紬",
    groups: [
      { label: "紬の穏やかな丁寧語", patterns: ["ワディーさん", "思います", "ですね"] },
      { label: "鳥白島/灯台守モチーフ", patterns: ["島", "灯台", "海", "船", "風", "本"] },
    ],
  },
  "diary-kotomi": {
    label: "ことみ",
    groups: [
      { label: "ことみの一人称・語尾", patterns: ["ことみ", "なの", "ワディーさん"] },
      { label: "図書室/本/バイオリン系モチーフ", patterns: ["図書室", "本", "ページ", "バイオリン", "読"] },
    ],
  },
  "diary-kiku8": {
    label: "キク8号",
    groups: [
      { label: "キク8号の管制口調", patterns: ["キク8号", "軌道計算完了", "ミッション遂行中", "観測開始"] },
      { label: "衛星/軌道/信号モチーフ", patterns: ["衛星", "軌道", "信号", "観測", "尺貫法", "お姉さん"] },
    ],
  },
  "diary-sharo": {
    label: "シャロ",
    groups: [
      { label: "シャロのツンデレ丁寧語", patterns: ["もう、ワディーさん", "ですからね", "じゃないです", "べ、別に"] },
      { label: "喫茶/カフェイン/節約モチーフ", patterns: ["ハーブティー", "カフェイン", "フルール", "カップ", "節約", "エスプレッソ"] },
    ],
  },
  "diary-ana": {
    label: "アナ",
    groups: [
      { label: "アナの日本語主体と照れ英語", patterns: ["アナ", "ワディーさん", "Oh!", "Sorry", "わたし"] },
      { label: "日本文化/猫/帰属モチーフ", patterns: ["日本", "お味噌汁", "サッちゃん", "猫", "外国人", "浴衣"] },
    ],
    forbidden: [
      { label: "長すぎる英語文", pattern: rx("(?:\\b[A-Za-z]+[ ,.?!']+){8,}[A-Za-z]+") },
    ],
  },
  "diary-mitsuba": {
    label: "みつば",
    groups: [
      { label: "みつばの強気・腹黒口調", patterns: ["あたし", "ふっ", "ちっ", "ワディー", "別に", "だし", "でしょ"] },
      { label: "計画/三つ子/長女モチーフ", patterns: ["計画", "作戦", "長女", "ふたば", "ひとは", "丸井"] },
    ],
    forbidden: [
      { label: "上品すぎる別人口調", pattern: /ですわ|ますわ|ワディーさん/g },
    ],
  },
  "diary-feiris": {
    label: "フェイリス",
    groups: [
      { label: "フェイリスのニャン語", patterns: ["ワディーニャン", "フェイリス", "ニャン", "チェシャー"] },
      { label: "秋葉原/メイクイーン/世界線モチーフ", patterns: ["メイクイーン", "秋葉原", "猫耳", "世界線", "留未穂", "チンチラ"] },
    ],
    forbidden: [
      { label: "ワディーニャン呼び抜け", pattern: /ワディーよ/g },
    ],
  },
  "diary-mayuki": {
    label: "真雪",
    groups: [
      { label: "真雪の強気から即デレ", patterns: ["ワディーさん", "わたし", "もう、", "べ、別に", "えへへ", "子供じゃ"] },
      { label: "衣装/メイド/裁縫モチーフ", patterns: ["衣装", "フリル", "メイド", "喫茶店", "布", "縫"] },
    ],
  },
  "diary-rin": {
    label: "りん",
    groups: [
      { label: "りんの短い毒舌・防御語", patterns: ["ワディー", "別に", "はぁ", "じゃん", "だし", "あたし"] },
      { label: "一人/大人/沈黙モチーフ", patterns: ["一人", "黙って", "大人", "友達", "甘", "そば"] },
    ],
  },
};

function findDiaryFileForDate(dir, date) {
  const fullDir = path.join(repoRoot, dir);
  if (!fs.existsSync(fullDir)) return null;

  const name = fs
    .readdirSync(fullDir)
    .find((entry) => entry.startsWith(`${date}_`) && DIARY_FILE_RE.test(entry));

  return name ? path.join(fullDir, name) : null;
}

function stripMarkdownForVoiceCheck(markdown) {
  const { body } = splitDiaryMarkdown(markdown);
  return body
    .replace(/<[^>]+>/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/\[[^\]]+\]\([^)]+\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function patternHits(text, patterns) {
  return patterns.filter((pattern) => {
    if (typeof pattern === "string") return text.includes(pattern);
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
}

export function findLatestMainDiaryDate() {
  const diaryDir = path.join(repoRoot, "diary");
  if (!fs.existsSync(diaryDir)) return null;

  return fs
    .readdirSync(diaryDir)
    .filter((name) => DIARY_FILE_RE.test(name))
    .map((name) => name.slice(0, 10))
    .sort()
    .at(-1) ?? null;
}

export function validateCharacterVoicesForDate(date, options = {}) {
  const rules = options.rules ?? CHARACTER_VOICE_RULES;
  const findings = [];
  const checked = [];
  const missing = [];

  for (const [dir, rule] of Object.entries(rules)) {
    const file = findDiaryFileForDate(dir, date);
    if (!file) {
      missing.push({ dir, label: rule.label });
      continue;
    }

    const markdown = fs.readFileSync(file, "utf8");
    const text = stripMarkdownForVoiceCheck(markdown);
    const failedGroups = [];
    const forbiddenHits = [];

    for (const group of rule.groups ?? []) {
      const hits = patternHits(text, group.patterns);
      if (hits.length === 0) {
        failedGroups.push({
          label: group.label,
          expected: group.patterns.map(String),
        });
      }
    }

    for (const item of rule.forbidden ?? []) {
      const hits = patternHits(text, [item.pattern]);
      if (hits.length > 0) {
        forbiddenHits.push({
          label: item.label,
          pattern: String(item.pattern),
        });
      }
    }

    checked.push({ dir, label: rule.label, file });

    if (failedGroups.length > 0 || forbiddenHits.length > 0) {
      findings.push({
        dir,
        label: rule.label,
        file: path.relative(repoRoot, file),
        failedGroups,
        forbiddenHits,
      });
    }
  }

  return { date, checked, missing, findings };
}

export function formatVoiceFindings(result) {
  const lines = [`${result.date} のキャラ口調チェックでズレを検出しました。`];

  for (const finding of result.findings) {
    lines.push(`- ${finding.label} (${finding.file})`);
    for (const group of finding.failedGroups) {
      lines.push(`  - 不足: ${group.label} / 期待語: ${group.expected.join(", ")}`);
    }
    for (const hit of finding.forbiddenHits) {
      lines.push(`  - NG: ${hit.label} / ${hit.pattern}`);
    }
  }

  return lines.join("\n");
}
