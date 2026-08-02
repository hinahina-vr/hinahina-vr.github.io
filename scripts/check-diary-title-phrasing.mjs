import path from "node:path";
import {
  collectDiaryMarkdownFiles,
  readDiaryFile,
  repoRoot,
} from "./lib/diary-self-date.mjs";

const DATE_TITLE_RE = /^(\d{4}-\d{2}-\d{2})_(.+)\.md$/;
const RETIRED_TITLES = new Set([
  "願望のまま掲げる",
  "五分後の窓口",
  "部品店へ行く理由",
  "町田の赤い一杯",
  "横臥宣言",
  "半端者の成長曲線",
  "もうええでしょう",
  "石ころの哲学",
  "神棚の上の人間様",
  "法治国家の村八分",
  "履修マップと辛いラーメン",
  "33秒で並んだ2つの店",
  "御坊の雨と麦畑の3枚",
  "縄文回帰のあと秋葉原へ",
  "マイコンとカニとステーキ",
  "ESP32とLLMガチャ",
  "25万8000円と美白ドリンク",
  "ヴォイヴォイとモルトの丘",
  "中本で拾った政治パロディ",
  "神話製作機械とアネモイ",
  "269番から28万円まで",
  "200円のビールと28万円の人形",
  "年収4000万円と電気工事士",
  "ビッグサイトから吟遊詩人へ",
  "箱崎ビルと自動リギング",
  "汁を舐めてモルト植毛",
  "雪花に断られてSEGへ",
  "寝ゲロから羽田まで",
  "鹵水鵝がベストアクト",
  "キックを拾えない夜",
  "パラパラから卒業制作へ",
  "画面の中にしかない",
  "サンダースネイクとカニ会",
  "藤沢ナイトルート",
  "呼気を光にする部屋",
  "江西を絵にしてから読む",
  "100万人より100人の狂信",
  "池田大作ダンスとナヒーダ",
  "AIを口説いた痕跡",
  "社内FDEの生活設計",
  "5月2度目の中本",
  "開成であじさいを吸う",
  "大往生からお家騒動へ",
  "獣王AIの機械割",
  "OLD is NEW",
  "150万人の料亭経営",
  "遊びを分析してしまう日",
  "リバティタワー",
  "22時40分の中本",
  "9000回転以来",
  "秩序を書き換える力",
  "了法寺のお守りにRIP",
  "資格の先の商流",
  "5度目の中本",
  "値札を付ける側",
  "9人を同じアバターにする",
  "同じ顔が9人立つまで",
  "VRMが一発で出るまで起こさない",
  "起こしてくれたら輝く季節",
]);
const ALLOWED_TO_FRAGMENTS = [
  "ちゃんと",
  "きちんと",
  "ずっと",
  "そっと",
  "もっと",
  "ちょっと",
  "やっと",
  "ほっと",
  "ふと",
  "きっと",
  "とても",
  "として",
  "という",
  "とき",
  "ところ",
  "こと",
  "ひと",
  "あと",
  "と呼ぶ",
  "と言う",
];

function parseArgs(argv) {
  const args = { all: true, date: null };

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--all") {
      args.all = true;
      continue;
    }

    if (argv[i] === "--date") {
      args.date = argv[i + 1] ?? null;
      args.all = false;
      i += 1;
      continue;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(argv[i]) && !args.date) {
      args.date = argv[i];
      args.all = false;
    }
  }

  return args;
}

function latestDate(files) {
  return files.map((file) => file.date).sort((left, right) => right.localeCompare(left))[0] ?? null;
}

function titleFromFilename(name) {
  return name.match(DATE_TITLE_RE)?.[2] ?? null;
}

function titleFromHeading(markdown, date) {
  const match = markdown.match(/^#\s+(.+)\s*$/m);
  if (!match) return null;
  return match[1].replace(new RegExp(`^${date}\\s+`), "").trim();
}

function stripAllowedToFragments(title) {
  return ALLOWED_TO_FRAGMENTS.reduce(
    (next, fragment) => next.replaceAll(fragment, ""),
    title,
  );
}

function hasParallelTitle(title) {
  return stripAllowedToFragments(title).includes("と");
}

const args = parseArgs(process.argv.slice(2));
const files = collectDiaryMarkdownFiles().filter((file) => file.dir === "diary");
const targetDate = args.date ?? (args.all ? null : latestDate(files));
const targets = files.filter((file) => args.all || file.date === targetDate);

if (targets.length === 0) {
  console.error(targetDate ? `${targetDate} の本編日記が見つかりませんでした。` : "対象の本編日記が見つかりませんでした。");
  process.exit(1);
}

const findings = [];

for (const file of targets) {
  const markdown = readDiaryFile(file);
  const filenameTitle = titleFromFilename(file.name);
  const headingTitle = titleFromHeading(markdown, file.date);

  if (!filenameTitle || !headingTitle) {
    findings.push({
      file: path.relative(repoRoot, file.fullPath),
      label: "構造",
      title: filenameTitle ?? headingTitle ?? "(タイトルなし)",
      reason: "ファイル名またはH1からタイトルを取得できません",
    });
    continue;
  }

  if (filenameTitle !== headingTitle) {
    findings.push({
      file: path.relative(repoRoot, file.fullPath),
      label: "不一致",
      title: `${filenameTitle} / ${headingTitle}`,
      reason: "ファイル名とH1のタイトルが一致しません",
    });
  }

  const titles = [
    ["ファイル名", filenameTitle],
    ["見出し", headingTitle],
  ];

  for (const [label, title] of titles) {
    if (hasParallelTitle(title)) {
      findings.push({
        file: path.relative(repoRoot, file.fullPath),
        label,
        title,
        reason: "AとBのような安易な並列表現です",
      });
    }

    if (RETIRED_TITLES.has(title)) {
      findings.push({
        file: path.relative(repoRoot, file.fullPath),
        label,
        title,
        reason: "本文の行動や対象が伝わらないため廃止したタイトルです",
      });
    }
  }
}

if (findings.length === 0) {
  console.log(targetDate ? `${targetDate} の本編日記タイトル明瞭性チェックを通過しました。` : "本編日記タイトル明瞭性チェックを通過しました。");
  process.exit(0);
}

console.error("本編日記タイトルの明瞭性チェックに失敗しました。本文を読まなくても行動や対象が分かるタイトルへ直してください。");
for (const finding of findings) {
  console.error(`- ${finding.file} (${finding.label}): ${finding.title} — ${finding.reason}`);
}
process.exit(1);
