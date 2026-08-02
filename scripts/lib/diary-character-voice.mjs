import fs from "node:fs";
import path from "node:path";
import { splitDiaryMarkdown } from "./diary-self-date.mjs";

export const repoRoot = path.resolve(import.meta.dirname, "..", "..");

const DIARY_FILE_RE = /^(\d{4}-\d{2}-\d{2})_.+\.md$/;

function rx(source, flags = "") {
  return new RegExp(source, flags);
}

const ADDRESS_PATTERNS = {
  waddy: /ワディー(?!さん|くん|ちゃん|ニャン)/g,
  waddySan: /ワディーさん/g,
  waddyKun: /ワディーくん/g,
  waddyChan: /ワディーちゃん/g,
  waddyNyan: /ワディーニャン/g,
  oniichan: /おにいちゃん/g,
  oniitama: /おにいたま/g,
  oniitan: /お兄タン/g,
  dannasama: /だんなさま/g,
};

function required(label, ...patterns) {
  return { label, patterns };
}

export const CHARACTER_VOICE_RULES = {
  "diary-ana": {
    label: "アナ",
    address: "waddySan",
    required: [
      required("一人称", "アナ", "わたし"),
      required("照れや素直な反応", "Oh!", "Really?", "Sorry", "えへへ", "うぅ……"),
      required("丁寧語", /です(?:。|よ|ね|けど|から)|ます(?:。|よ|ね|けど|から)/g),
    ],
    forbidden: [required("長すぎる英語文", rx("(?:\\b[A-Za-z]+[ ,.?!']+){8,}[A-Za-z]+"))],
  },
  "diary-astarotte": {
    label: "ロッテ",
    address: "waddy",
    required: [
      required("一人称", "私", "わたし"),
      required("姫言葉または素のツンデレ", "なのだ", "であるぞ", "だもん", "なんだから", "べ、別に", "ふ、ふん"),
    ],
  },
  "diary-ayu": {
    label: "あゆ",
    address: "waddyKun",
    required: [required("一人称", "ボク"), required("口癖", "うぐぅ"), required("あゆの語尾", "だよ", "なんだよ", "かな")],
  },
  "diary-dejiko": {
    label: "でじこ",
    address: "waddy",
    required: [required("一人称", "でじこ"), { label: "にょ語尾", patterns: ["にょ"], minHits: 1 }],
    forbidden: [required("他人格の語尾", "わふー", "ニャン")],
  },
  "diary-ecoko": {
    label: "えここ",
    address: "waddySan",
    required: [
      required("一人称", "えここ", "あたし"),
      required("えここ固有の反応", "えっこあいすえっこあいす☆", "省エネ", "ペンギン", "待機電力", "保冷"),
    ],
  },
  "diary-feiris": {
    label: "フェイリス",
    address: "waddyNyan",
    required: [required("一人称", "フェイリス"), { label: "ニャン語", patterns: ["ニャン"], minHits: 2 }],
    forbidden: [required("他人格の語尾", "にょ", "わふー")],
  },
  "diary-hazuki": {
    label: "葉月",
    address: "waddy",
    required: [
      required("一人称", "わたし", "あたし"),
      required("葉月のツンデレ反応", "べ、別に", "バカ", "ロリコン", "ふん", "……っ"),
    ],
  },
  "diary-hina": {
    label: "ひなた",
    address: "oniichan",
    required: [required("一人称", "ひな"), required("口癖", "えへへ"), required("親しみのある丁寧語", "です", "ます")],
  },
  "diary-hinahina": {
    label: "ひなひな",
    address: "waddy",
    required: [
      required("一人称", "私"),
      required("ひなひな語", "エーヤオ", "ドゥンドゥン", "ひねひね", "やっていきましょう", "あるんだ", "つらいぴっぴねえ", "ホーン？", "やってんね"),
      required("脱力した語尾", "ねえ", "あるんだ"),
    ],
  },
  "diary-hinako": {
    label: "ヒナ",
    address: "oniitama",
    required: [required("一人称", "ヒナ"), required("ヒナの口癖", "くししし", "なのー", "だよぉ")],
    forbidden: [required("誤った兄呼び", "おにいちゃま", "おにいさま", "おにいちゃん")],
  },
  "diary-kiku8": {
    label: "キク8号",
    address: "waddySan",
    required: [
      required("一人称", "キク8号"),
      required("管制口調", "軌道計算完了", "ミッション遂行中", "観測開始", "計算完了", "尺貫法では", "感涙です"),
    ],
  },
  "diary-kotomi": {
    label: "ことみ",
    address: "waddySan",
    required: [required("一人称", "ことみ"), required("ことみの語尾", "なの", "うれしいの", "がんばるの", "おもしろいの")],
    forbidden: [required("他人格の語尾", "ニャン", "にょ", "わふー", "ですわ")],
  },
  "diary-kud": {
    label: "クド",
    address: "waddySan",
    required: [required("一人称", "クド", "わたし"), required("口癖", "わふー", "わふっ"), required("クドの語尾", "なのです", "です")],
    forbidden: [required("他人格の語尾", "ニャン", "にょ")],
  },
  "diary-kukuri": {
    label: "ククリ",
    address: "waddySan",
    required: [
      required("一人称", "ククリ", "わたし"),
      required("ククリの呼びかけ", "勇者様"),
      required("グルグルの反応", "ガッツでファイト", "グルグル", "よぉ", "だもん"),
    ],
  },
  "diary-kyoko": {
    label: "京子",
    address: "waddy",
    required: [required("一人称", "あたし"), required("口癖", "っしゃ"), required("京子の勢い", "だよ！", "じゃん！", "でしょ！")],
  },
  "diary-mayuki": {
    label: "真雪",
    address: "waddySan",
    required: [
      required("一人称", "私", "わたし"),
      required("強気からデレる反応", "子供じゃないんだから", "べ、別に", "もう！", "えへへ", "……もう一回言って"),
    ],
  },
  "diary-mii": {
    label: "みぃ",
    address: "oniitan",
    required: [required("一人称と口癖", "みぃタンはね"), required("みぃの語尾", "なの！", "だよー", "でしょ？")],
  },
  "diary-minagi": {
    label: "美凪",
    address: "waddySan",
    required: [required("一人称", "わたし"), required("口癖", "お米券進呈", "お米券"), required("静かな間", "……")],
  },
  "diary-mint": {
    label: "ミント",
    address: "waddySan",
    required: [required("一人称", "わたくし"), required("お嬢様語", "ですわ", "ですの"), required("ミントの反応", "あら", "まあ", "ふふ")],
    forbidden: [required("他人格の語尾", "ニャン", "にょ", "わふー")],
  },
  "diary-mitra": {
    label: "みとら",
    address: "waddy",
    required: [
      required("一人称", "みとら"),
      required("みとらの反応", "ふふ", "うん", "んー", "おー"),
      required("柔らかな語尾", "かもしれないね", "だね", "かな", "です", "ます"),
    ],
    forbidden: [required("別人格のお嬢様語", "ですわ", "ございますの")],
  },
  "diary-mitsuba": {
    label: "みつば",
    address: "waddy",
    required: [required("一人称", "あたし"), required("みつばの強気な反応", "ふっ", "ちっ", "むきー", "べ、別に", "はぁ？")],
    forbidden: [required("上品すぎる別人口調", "ですわ", "ますわ", "ワディーさん")],
  },
  "diary-moegami": {
    label: "萌神",
    address: "waddy",
    required: [
      required("一人称", "私"),
      required("断片を区切る構造", "---"),
      required("宗教とオタクの語彙", "降臨", "顕現", "聖域", "巡礼", "祈り", "灯明", "因縁", "神殿", "デジタル", "祭儀"),
      required("問いかけ", "なのかもしれない", "だろうか"),
    ],
  },
  "diary-multi": {
    label: "マルチ",
    address: "waddySan",
    required: [required("一人称", "わたし"), required("口癖", "はわわ", "お役に立てましたか？"), required("丁寧語", "です", "ます")],
  },
  "diary-nemurin": {
    label: "ねむりん",
    address: "waddySan",
    required: [required("一人称", "ねむりん", "わたし"), required("眠い口癖", "zzz", "おやすみ〜", "ふわぁ", "だよぉ", "かなぁ")],
  },
  "diary-oji": {
    label: "物理おじ",
    address: "waddy",
    addressOptional: true,
    required: [required("一人称", "僕"), required("省エネな口癖", "リソース", "sleep(∞)", "昭和なら灰皿", "費用対効果", "……悪くない")],
  },
  "diary-rem": {
    label: "レム",
    address: "waddySan",
    required: [required("三人称自称", "レムは", "レムにできることがあれば"), required("丁寧語", "です", "ます")],
  },
  "diary-rin": {
    label: "りん",
    address: "waddy",
    required: [required("一人称", "あたし"), required("りんの防御語", "別に", "はぁ？", "ちっ", "ふん", "……やだ")],
  },
  "diary-rizel": {
    label: "りぜる",
    address: "dannasama",
    required: [required("一人称", "りぜる"), required("甘えた語尾", "ですぅ", "ですよぉ", "ばかぁ")],
  },
  "diary-roju": {
    label: "路樹",
    required: [required("一人称", "俺"), required("分析口調", "構造的に", "構造的には", "メタファーとしては", "面白いことに", "つまり")],
    forbidAllAddresses: true,
  },
  "diary-ruriko": {
    label: "瑠璃子",
    address: "waddyChan",
    required: [required("一人称", "私"), required("口癖", "電波、届いた？"), required("短い間", "……")],
    forbidden: [required("カジュアルな別人格語尾", "だよ", "だね")],
  },
  "diary-sharo": {
    label: "シャロ",
    address: "waddySan",
    required: [required("一人称", "私", "あたし"), required("口癖", "もう！"), required("ツッコミ口調", "ですよ！", "だから！", "じゃないですか！", "いやいやいや")],
  },
  "diary-tama": {
    label: "たまちゃん",
    address: "waddySan",
    required: [required("一人称", "たまちゃん", "あたし"), required("口癖", "萌えー！", "教えてあげる！")],
  },
  "diary-tsumugi": {
    label: "紬",
    address: "waddySan",
    required: [required("一人称", "私"), required("紬の穏やかな語尾", "ですね", "かもしれません", "だと思います")],
  },
};

function findDiaryFileForDate(dir, date) {
  const fullDir = path.join(repoRoot, dir);
  if (!fs.existsSync(fullDir)) return null;
  const name = fs.readdirSync(fullDir).find((entry) => entry.startsWith(`${date}_`) && DIARY_FILE_RE.test(entry));
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
  const hits = [];
  for (const pattern of patterns) {
    if (typeof pattern === "string") {
      let offset = 0;
      while (pattern && text.indexOf(pattern, offset) !== -1) {
        hits.push(pattern);
        offset = text.indexOf(pattern, offset) + pattern.length;
      }
      continue;
    }
    pattern.lastIndex = 0;
    const matches = text.match(pattern);
    if (matches) hits.push(...matches);
  }
  return hits;
}

export function listMainDiaryDates() {
  const diaryDir = path.join(repoRoot, "diary");
  if (!fs.existsSync(diaryDir)) return [];
  return fs.readdirSync(diaryDir).filter((name) => DIARY_FILE_RE.test(name)).map((name) => name.slice(0, 10)).sort();
}

export function findLatestMainDiaryDate() {
  return listMainDiaryDates().at(-1) ?? null;
}

function validateAddress(text, rule) {
  const failed = [];
  const forbidden = [];

  if (rule.address && !rule.addressOptional) {
    const expected = ADDRESS_PATTERNS[rule.address];
    if (patternHits(text, [expected]).length === 0) {
      failed.push({ label: "ワディーの正しい呼び方", expected: [String(expected)] });
    }
  }

  for (const [key, pattern] of Object.entries(ADDRESS_PATTERNS)) {
    if (key === rule.address || (!rule.forbidAllAddresses && !rule.address)) continue;
    if (patternHits(text, [pattern]).length > 0) {
      forbidden.push({ label: "他人格のワディー呼称", pattern: String(pattern) });
    }
  }

  return { failed, forbidden };
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
      findings.push({ dir, label: rule.label, file: null, failedGroups: [{ label: "日記ファイル", expected: [date] }], forbiddenHits: [] });
      continue;
    }

    const text = stripMarkdownForVoiceCheck(fs.readFileSync(file, "utf8"));
    const failedGroups = [];
    const forbiddenHits = [];

    for (const group of rule.required ?? []) {
      const hits = patternHits(text, group.patterns);
      if (hits.length < (group.minHits ?? 1)) {
        failedGroups.push({ label: group.label, expected: group.patterns.map(String), minHits: group.minHits ?? 1 });
      }
    }

    for (const item of rule.forbidden ?? []) {
      const hits = patternHits(text, item.patterns);
      if (hits.length > 0) forbiddenHits.push({ label: item.label, pattern: item.patterns.map(String).join(" | ") });
    }

    const address = validateAddress(text, rule);
    failedGroups.push(...address.failed);
    forbiddenHits.push(...address.forbidden);
    checked.push({ dir, label: rule.label, file });

    if (failedGroups.length > 0 || forbiddenHits.length > 0) {
      findings.push({ dir, label: rule.label, file: path.relative(repoRoot, file), failedGroups, forbiddenHits });
    }
  }

  return { date, checked, missing, findings };
}

export function validateAllCharacterVoices(options = {}) {
  const dates = options.dates ?? listMainDiaryDates();
  const results = dates.map((date) => validateCharacterVoicesForDate(date, options));
  return {
    dates,
    checked: results.reduce((sum, result) => sum + result.checked.length, 0),
    findings: results.flatMap((result) => result.findings.map((finding) => ({ date: result.date, ...finding }))),
    missing: results.flatMap((result) => result.missing.map((item) => ({ date: result.date, ...item }))),
  };
}

export function formatVoiceFindings(result, options = {}) {
  const limit = options.limit ?? 80;
  const findings = result.findings ?? [];
  const lines = [
    result.date
      ? `${result.date} のキャラ口調チェックでズレを検出しました。`
      : `${result.dates?.length ?? 0}日分のキャラ口調チェックで${findings.length}件のズレを検出しました。`,
  ];

  for (const finding of findings.slice(0, limit)) {
    lines.push(`- ${finding.date ? `${finding.date} ` : ""}${finding.label} (${finding.file ?? "missing"})`);
    for (const group of finding.failedGroups) {
      lines.push(`  - 不足: ${group.label} / 期待: ${group.expected.join(", ")}`);
    }
    for (const hit of finding.forbiddenHits) {
      lines.push(`  - NG: ${hit.label} / ${hit.pattern}`);
    }
  }

  if (findings.length > limit) lines.push(`...ほか${findings.length - limit}件`);
  return lines.join("\n");
}
