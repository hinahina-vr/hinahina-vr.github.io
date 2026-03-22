import { isValidEmotion } from "./emotion-resolver.js";

const DEFAULT_SCENARIO_NAME = "2026-03-18_声の座標";

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeBgmCue(bgm, stepIndex, warnings) {
  if (bgm == null) {
    return null;
  }

  if (typeof bgm === "string") {
    const value = bgm.trim();
    if (!value) {
      return null;
    }
    if (value === "stop" || value === "none" || value === "off") {
      return { stop: true };
    }
    return {
      track: value,
      src: null,
      volume: 0.45,
      loop: true,
      stop: false,
    };
  }

  if (typeof bgm !== "object" || Array.isArray(bgm)) {
    warnings.push(`step[${stepIndex}] の bgm が無効です。`);
    return null;
  }

  if (bgm.stop === true) {
    return { stop: true };
  }

  const track = asString(bgm.track).trim();
  const src = asString(bgm.src).trim();
  if (!track && !src) {
    warnings.push(`step[${stepIndex}] の bgm に track か src がありません。`);
    return null;
  }

  const volume = Number(bgm.volume);

  return {
    track: track || null,
    src: src || null,
    volume: Number.isFinite(volume) ? volume : 0.45,
    loop: bgm.loop !== false,
    stop: false,
  };
}

function normalizeChoice(choice, stepIndex, warnings) {
  const text = asString(choice?.text || choice?.label).trim();
  const gotoLabel = asString(choice?.goto || choice?.route).trim();
  if (!text) {
    warnings.push(`choices[${stepIndex}] に text がありません。`);
    return null;
  }
  const flag = asString(choice?.flag).trim() || null;
  const condition = asString(choice?.if).trim() || null;
  const conditionNot = asString(choice?.ifNot).trim() || null;
  return { text, goto: gotoLabel || null, flag, if: condition, ifNot: conditionNot };
}

function normalizeTextStep(step, stepIndex, warnings, chars) {
  const speaker = asString(step.speaker, "narrator").trim() || "narrator";
  const text = asString(step.text).trim();

  if (!text) {
    warnings.push(`step[${stepIndex}] の text が空です。`);
  }

  if (!chars[speaker]) {
    warnings.push(`step[${stepIndex}] が未知の speaker "${speaker}" を参照しています。`);
  }

  const emotion = isValidEmotion(step.emotion) ? step.emotion : null;
  if (step.emotion && !emotion) {
    warnings.push(`step[${stepIndex}] の emotion "${step.emotion}" は無効です。`);
  }

  return {
    kind: "text",
    speaker,
    text,
    expression: asString(step.expression),
    emotion,
    voiceId: asString(step.voiceId).trim() || null,
    bg: step.bg ?? null,
    bgm: normalizeBgmCue(step.bgm, stepIndex, warnings),
  };
}

function normalizeStep(step, stepIndex, warnings, chars) {
  if (!step || typeof step !== "object") {
    warnings.push(`step[${stepIndex}] がオブジェクトではありません。`);
    return null;
  }

  if (step.chapter) {
    return {
      kind: "chapter",
      chapter: asString(step.chapter),
      bg: step.bg ?? null,
      bgm: normalizeBgmCue(step.bgm, stepIndex, warnings),
    };
  }

  if (step.choices || step.choice) {
    const source = step.choices || step.choice;
    const choices = Array.isArray(source)
      ? source
          .map((choice) => normalizeChoice(choice, stepIndex, warnings))
          .filter(Boolean)
      : [];
    return {
      kind: "choices",
      choices,
      bgm: normalizeBgmCue(step.bgm, stepIndex, warnings),
    };
  }

  if (step.label) {
    return {
      kind: "label",
      label: asString(step.label).trim(),
      bgm: normalizeBgmCue(step.bgm, stepIndex, warnings),
    };
  }

  if (step.flag && !Object.prototype.hasOwnProperty.call(step, "text")) {
    return {
      kind: "flag",
      flag: asString(step.flag).trim(),
      bgm: normalizeBgmCue(step.bgm, stepIndex, warnings),
    };
  }

  if (step.if && step.goto) {
    return {
      kind: "if",
      condition: asString(step.if).trim(),
      target: asString(step.goto).trim(),
      elseTarget: asString(step.else).trim() || null,
      bgm: normalizeBgmCue(step.bgm, stepIndex, warnings),
    };
  }

  if (step.ifNot && step.goto) {
    return {
      kind: "ifNot",
      condition: asString(step.ifNot).trim(),
      target: asString(step.goto).trim(),
      elseTarget: asString(step.else).trim() || null,
      bgm: normalizeBgmCue(step.bgm, stepIndex, warnings),
    };
  }

  if (step.loadScenario) {
    return {
      kind: "loadScenario",
      scenario: asString(step.loadScenario).trim(),
      bgm: normalizeBgmCue(step.bgm, stepIndex, warnings),
    };
  }

  if (step.goto) {
    return {
      kind: "goto",
      target: asString(step.goto).trim(),
      bgm: normalizeBgmCue(step.bgm, stepIndex, warnings),
    };
  }

  if (step.end) {
    return {
      kind: "end",
      title: asString(step.title, "— F I N —"),
      subtitle: asString(step.subtitle),
      bgm: normalizeBgmCue(step.bgm, stepIndex, warnings),
    };
  }

  if (step.ending) {
    const ending = asObject(step.ending);
    return {
      kind: "end",
      title: asString(ending.title, "— F I N —"),
      subtitle: asString(ending.subtitle),
      bgm: normalizeBgmCue(step.bgm, stepIndex, warnings),
    };
  }

  if (step.bgm && !Object.prototype.hasOwnProperty.call(step, "text") && !step.bg) {
    return {
      kind: "bgm",
      bgm: normalizeBgmCue(step.bgm, stepIndex, warnings),
    };
  }

  if (step.bg && !Object.prototype.hasOwnProperty.call(step, "text")) {
    return {
      kind: "bg",
      bg: step.bg,
      bgm: normalizeBgmCue(step.bgm, stepIndex, warnings),
    };
  }

  if (Object.prototype.hasOwnProperty.call(step, "text")) {
    return normalizeTextStep(step, stepIndex, warnings, chars);
  }

  warnings.push(`step[${stepIndex}] の種別を判定できません。`);
  return null;
}

function normalizeChars(chars, warnings) {
  const source = asObject(chars);
  const entries = Object.entries(source);
  if (entries.length === 0) {
    warnings.push("chars が空です。");
  }

  return Object.fromEntries(
    entries.map(([speakerKey, value]) => {
      const charData = asObject(value);
      return [
        speakerKey,
        {
          name: asString(charData.name),
          color: asString(charData.color),
          emoji: asString(charData.emoji),
        },
      ];
    })
  );
}

function deriveScenarioName() {
  const params = new URLSearchParams(window.location.search);
  const scenario = params.get("scenario");
  if (!scenario) {
    throw new Error(
      "scenario パラメータが指定されていません。\n" +
      "URL例: galge-scenario?scenario=2026-03-20_各駅停車の形而上学\n" +
      "現在のURL: " + window.location.href
    );
  }
  return scenario;
}

export async function loadScenarioDefinition() {
  const scenarioName = deriveScenarioName();
  const warnings = [];
  const url = `./scenarios/${encodeURIComponent(scenarioName)}.json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`${scenarioName}.json の読み込みに失敗しました: ${response.status} ${response.statusText}`);
  }

  const raw = await response.json();
  const chars = normalizeChars(raw.chars, warnings);
  const id = asString(raw.id).trim() || scenarioName;
  const scenario = Array.isArray(raw.scenario)
    ? raw.scenario
        .map((step, index) => normalizeStep(step, index, warnings, chars))
        .filter(Boolean)
    : [];

  if (!raw.id) {
    warnings.push(`scenario "${scenarioName}" に id がないため "${id}" を採用しました。`);
  }

  if (!Array.isArray(raw.scenario)) {
    warnings.push(`scenario "${scenarioName}" に scenario 配列がありません。`);
  }

  const defaultBgmRaw = raw.defaultBgm ?? {
    src: "./assets/bgm/wasurenagusa.mp3",
    volume: 0.10,
    loop: true,
  };
  const defaultBgm = normalizeBgmCue(defaultBgmRaw, -1, warnings);

  const normalized = {
    scenarioName,
    id,
    audioNamespace: asString(raw.audioNamespace).trim() || id,
    bgmNamespace: asString(raw.bgmNamespace).trim() || asString(raw.audioNamespace).trim() || id,
    title: asString(raw.title, scenarioName),
    subtitle: asString(raw.subtitle),
    genre: asString(raw.genre),
    date: asString(raw.date),
    chars,
    steps: scenario,
    defaultBgm,
    warnings,
  };

  return normalized;
}
