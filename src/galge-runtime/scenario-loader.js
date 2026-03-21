import { isValidEmotion } from "./emotion-resolver.js";

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeChoice(choice, stepIndex, warnings) {
  const text = asString(choice?.text).trim();
  const gotoLabel = asString(choice?.goto).trim();
  if (!text) {
    warnings.push(`choices[${stepIndex}] に text がありません。`);
    return null;
  }
  return { text, goto: gotoLabel || null };
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
    };
  }

  if (step.choices) {
    const choices = Array.isArray(step.choices)
      ? step.choices
          .map((choice) => normalizeChoice(choice, stepIndex, warnings))
          .filter(Boolean)
      : [];
    return { kind: "choices", choices };
  }

  if (step.label) {
    return { kind: "label", label: asString(step.label).trim() };
  }

  if (step.end) {
    return {
      kind: "end",
      title: asString(step.title, "— F I N —"),
      subtitle: asString(step.subtitle),
    };
  }

  if (step.bg && !Object.prototype.hasOwnProperty.call(step, "text")) {
    return { kind: "bg", bg: step.bg };
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
  return params.get("scenario") || "2026-03-18_声の座標";
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

  const normalized = {
    scenarioName,
    id,
    audioNamespace: asString(raw.audioNamespace).trim() || id,
    title: asString(raw.title, scenarioName),
    subtitle: asString(raw.subtitle),
    genre: asString(raw.genre),
    date: asString(raw.date),
    chars,
    steps: scenario,
    warnings,
  };

  return normalized;
}
