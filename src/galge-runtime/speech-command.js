function normalizeCommandText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[。、，,.!！?？「」『』"'（）()\[\]\s]+/g, "");
}

const START_PATTERNS = ["はじめる", "始める", "開始", "スタート", "start"];
const OPEN_SETTINGS_PATTERNS = ["設定", "モデル設定", "せってい"];
const CLOSE_SETTINGS_PATTERNS = ["閉じる", "とじる", "閉じて", "close"];
const ADVANCE_PATTERNS = ["次へ", "つぎへ", "進む", "すすむ", "進んで", "つぎ", "continue", "next"];
const BACK_PATTERNS = ["戻る", "もどる", "前へ", "まえへ", "back"];
const MODE_CLASSIC_PATTERNS = ["クラシック", "classic", "レトロ"];
const MODE_IMMERSIVE_PATTERNS = ["イマーシブ", "immersive", "没入"];
const MUTE_ON_PATTERNS = ["ミュート", "音声オフ", "無音", "mute"];
const MUTE_OFF_PATTERNS = ["音声オン", "ミュート解除", "解除", "unmute"];

const CHOICE_INDEX_PATTERNS = [
  ["1", "一番", "1番", "1つ目", "ひとつめ", "最初", "左"],
  ["2", "二番", "2番", "2つ目", "ふたつめ", "右"],
  ["3", "三番", "3番", "3つ目", "みっつめ"],
  ["4", "四番", "4番", "4つ目", "よっつめ"],
];

function includesAny(text, patterns) {
  return patterns.some((pattern) => text.includes(normalizeCommandText(pattern)));
}

function resolveChoiceIndexByText(text, choiceTexts) {
  for (let index = 0; index < CHOICE_INDEX_PATTERNS.length; index += 1) {
    if (includesAny(text, CHOICE_INDEX_PATTERNS[index])) {
      return index;
    }
  }

  const normalizedChoiceTexts = choiceTexts.map((choiceText) => normalizeCommandText(choiceText));
  for (let index = 0; index < normalizedChoiceTexts.length; index += 1) {
    const choiceText = normalizedChoiceTexts[index];
    if (!choiceText) {
      continue;
    }
    if (text.includes(choiceText)) {
      return index;
    }
    if (text.length >= 3 && choiceText.includes(text)) {
      return index;
    }
    const prefix = choiceText.slice(0, Math.min(4, choiceText.length));
    if (prefix && text.includes(prefix)) {
      return index;
    }
  }

  return null;
}

export function resolveSpeechCommand({
  transcript,
  started,
  showingChoice,
  choiceTexts = [],
  settingsOpen,
}) {
  const normalized = normalizeCommandText(transcript);
  if (!normalized) {
    return null;
  }

  if (showingChoice) {
    const choiceIndex = resolveChoiceIndexByText(normalized, choiceTexts);
    if (choiceIndex !== null && choiceIndex < choiceTexts.length) {
      return { type: "choose", index: choiceIndex };
    }
  }

  if (!started && includesAny(normalized, START_PATTERNS)) {
    return { type: "start" };
  }

  if (settingsOpen && includesAny(normalized, CLOSE_SETTINGS_PATTERNS)) {
    return { type: "close-settings" };
  }

  if (includesAny(normalized, OPEN_SETTINGS_PATTERNS)) {
    return { type: "open-settings" };
  }

  if (includesAny(normalized, MODE_CLASSIC_PATTERNS)) {
    return { type: "mode-classic" };
  }

  if (includesAny(normalized, MODE_IMMERSIVE_PATTERNS)) {
    return { type: "mode-immersive" };
  }

  if (includesAny(normalized, MUTE_OFF_PATTERNS)) {
    return { type: "mute-off" };
  }

  if (includesAny(normalized, MUTE_ON_PATTERNS)) {
    return { type: "mute-on" };
  }

  if (started && includesAny(normalized, BACK_PATTERNS)) {
    return { type: "back" };
  }

  if (started && includesAny(normalized, ADVANCE_PATTERNS)) {
    return { type: "advance" };
  }

  return null;
}
