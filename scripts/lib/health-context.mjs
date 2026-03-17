const HEALTH_TOPIC_LIMIT = 2;

export const DEFAULT_HEALTH_CONFIG = {
  enabled: true,
  source: "huawei-health-kit-android",
  adbPath: "adb",
  androidPackage: "io.waddy.ookuhealthexporter",
  exportDirOnDevice: "/sdcard/Download/OokuHealth",
  defaultMetrics: ["sleep", "activity", "vitals"],
};

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function sanitizeInteger(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizeNumber(value, fractionDigits = 0) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (fractionDigits <= 0) return parsed;
  return Number(parsed.toFixed(fractionDigits));
}

function sanitizeIsoString(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function normalizeSleepSummary(summary = {}) {
  return {
    totalMinutes: sanitizeInteger(summary.totalMinutes),
    deepMinutes: sanitizeInteger(summary.deepMinutes),
    lightMinutes: sanitizeInteger(summary.lightMinutes),
    remMinutes: sanitizeInteger(summary.remMinutes),
    awakeMinutes: sanitizeInteger(summary.awakeMinutes),
    startAt: sanitizeIsoString(summary.startAt),
    endAt: sanitizeIsoString(summary.endAt),
  };
}

function normalizeActivitySummary(summary = {}) {
  return {
    steps: sanitizeInteger(summary.steps),
    distanceMeters: sanitizeNumber(summary.distanceMeters, 1),
    activeCaloriesKcal: sanitizeNumber(summary.activeCaloriesKcal, 1),
    exerciseMinutes: sanitizeInteger(summary.exerciseMinutes),
  };
}

function normalizeVitalsSummary(summary = {}) {
  return {
    restingHeartRateBpm: sanitizeInteger(summary.restingHeartRateBpm),
    averageHeartRateBpm: sanitizeInteger(summary.averageHeartRateBpm),
    minSpO2Pct: sanitizeInteger(summary.minSpO2Pct),
  };
}

export function cloneJson(value) {
  return value ? JSON.parse(JSON.stringify(value)) : value;
}

export function mergeHealthConfig(config = {}) {
  const merged = {
    ...DEFAULT_HEALTH_CONFIG,
    ...(config ?? {}),
  };

  if (!Array.isArray(merged.defaultMetrics) || merged.defaultMetrics.length === 0) {
    merged.defaultMetrics = [...DEFAULT_HEALTH_CONFIG.defaultMetrics];
  }

  return merged;
}

export function createSkippedHealthSource(config, note = "未取得") {
  return {
    status: "skipped",
    note,
    source: config.source,
    exportedAt: null,
    device: {
      watchModel: null,
      phonePlatform: "android",
    },
    summary: {
      sleep: normalizeSleepSummary(),
      activity: normalizeActivitySummary(),
      vitals: normalizeVitalsSummary(),
    },
  };
}

function resolveHealthPayload(payload) {
  if (payload?.sources?.health) return payload.sources.health;
  if (payload?.health && typeof payload.health === "object") return payload.health;
  return payload;
}

export function normalizeHealthExport(payload, { date, timezone, config }) {
  const resolved = resolveHealthPayload(payload);
  if (!resolved || typeof resolved !== "object") {
    throw new Error("Health export payload is empty");
  }

  const payloadDate = resolved.date ?? payload?.date ?? null;
  if (payloadDate && payloadDate !== date) {
    throw new Error(`Health export date mismatch: expected ${date}, got ${payloadDate}`);
  }

  const summary = resolved.summary ?? {};
  const status = cleanText(resolved.status || payload?.status || "ok") || "ok";
  const note = resolved.note ? cleanText(resolved.note) : null;

  return {
    status,
    note,
    source: cleanText(resolved.source || payload?.source || config.source) || config.source,
    exportedAt: sanitizeIsoString(resolved.exportedAt ?? payload?.exportedAt) ?? new Date().toISOString(),
    device: {
      watchModel: cleanText(resolved.device?.watchModel ?? payload?.device?.watchModel) || "HUAWEI WATCH FIT 4 Pro",
      phonePlatform: cleanText(resolved.device?.phonePlatform ?? payload?.device?.phonePlatform) || "android",
    },
    summary: {
      sleep: normalizeSleepSummary(summary.sleep),
      activity: normalizeActivitySummary(summary.activity),
      vitals: normalizeVitalsSummary(summary.vitals),
    },
    date,
    timezone: cleanText(resolved.timezone ?? payload?.timezone) || timezone,
    version: sanitizeInteger(resolved.version ?? payload?.version) ?? 1,
  };
}

export function hasHealthSummaryData(source) {
  if (!source || source.status !== "ok" || !source.summary) return false;
  const { sleep = {}, activity = {}, vitals = {} } = source.summary;
  return [
    sleep.totalMinutes,
    sleep.deepMinutes,
    sleep.lightMinutes,
    sleep.remMinutes,
    sleep.awakeMinutes,
    activity.steps,
    activity.distanceMeters,
    activity.activeCaloriesKcal,
    activity.exerciseMinutes,
    vitals.restingHeartRateBpm,
    vitals.averageHeartRateBpm,
    vitals.minSpO2Pct,
  ].some((value) => value !== null && value !== undefined);
}

function formatMinutes(value) {
  if (value === null || value === undefined) return null;
  const total = Math.max(0, sanitizeInteger(value) ?? 0);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours > 0) {
    return `${hours}時間${String(minutes).padStart(2, "0")}分`;
  }
  return `${minutes}分`;
}

function formatCount(value) {
  if (value === null || value === undefined) return null;
  return new Intl.NumberFormat("ja-JP").format(value);
}

function formatKilometers(meters) {
  if (meters === null || meters === undefined) return null;
  const kilometers = Number(meters) / 1000;
  if (!Number.isFinite(kilometers)) return null;
  return new Intl.NumberFormat("ja-JP", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(kilometers);
}

function buildSleepLine(summary) {
  if (!summary || summary.totalMinutes === null) return null;
  const parts = [];
  if (summary.deepMinutes !== null) parts.push(`深い ${formatMinutes(summary.deepMinutes)}`);
  if (summary.lightMinutes !== null) parts.push(`浅い ${formatMinutes(summary.lightMinutes)}`);
  if (summary.remMinutes !== null) parts.push(`REM ${formatMinutes(summary.remMinutes)}`);
  if (summary.awakeMinutes !== null) parts.push(`覚醒 ${formatMinutes(summary.awakeMinutes)}`);
  const suffix = parts.length > 0 ? `（${parts.join(" / ")}）` : "";
  return `- 睡眠: ${formatMinutes(summary.totalMinutes)}${suffix}`;
}

function buildActivityLine(summary) {
  if (!summary) return null;
  const parts = [];
  if (summary.steps !== null) parts.push(`${formatCount(summary.steps)}歩`);
  const km = formatKilometers(summary.distanceMeters);
  if (km !== null) parts.push(`${km}km`);
  if (summary.activeCaloriesKcal !== null) parts.push(`${formatCount(Math.round(summary.activeCaloriesKcal))}kcal`);
  if (summary.exerciseMinutes !== null) parts.push(`運動 ${formatMinutes(summary.exerciseMinutes)}`);
  return parts.length > 0 ? `- 活動: ${parts.join(" / ")}` : null;
}

function buildVitalsLine(summary) {
  if (!summary) return null;
  const parts = [];
  if (summary.restingHeartRateBpm !== null) parts.push(`安静時心拍 ${summary.restingHeartRateBpm}bpm`);
  if (summary.averageHeartRateBpm !== null) parts.push(`平均 ${summary.averageHeartRateBpm}bpm`);
  if (summary.minSpO2Pct !== null) parts.push(`最低SpO2 ${summary.minSpO2Pct}%`);
  return parts.length > 0 ? `- 生体: ${parts.join(" / ")}` : null;
}

export function renderHealthSourceLines(source) {
  if (!source) return ["- 未取得"];
  if (source.status === "error") {
    return [`- 取得できず: ${cleanText(source.note || "不明なエラー")}`];
  }
  if (source.status === "disabled") return ["- 無効"];
  if (source.status === "skipped") return [`- ${cleanText(source.note || "取得をスキップ")}`];
  if (!hasHealthSummaryData(source)) return ["- 該当なし"];

  const lines = [];
  const sleepLine = buildSleepLine(source.summary.sleep);
  const activityLine = buildActivityLine(source.summary.activity);
  const vitalsLine = buildVitalsLine(source.summary.vitals);

  if (sleepLine) lines.push(sleepLine);
  if (activityLine) lines.push(activityLine);
  if (vitalsLine) lines.push(vitalsLine);
  lines.push("- 注記: 参考値。診断用途では使わない");

  return lines;
}

export function buildHealthCandidateTopics(source) {
  if (!hasHealthSummaryData(source)) return [];

  const topics = [];
  const sleepTopic = formatMinutes(source.summary.sleep?.totalMinutes);
  if (sleepTopic) topics.push(`睡眠 ${sleepTopic}`);

  if (topics.length < HEALTH_TOPIC_LIMIT && source.summary.activity?.steps !== null) {
    topics.push(`${formatCount(source.summary.activity.steps)}歩あるいた`);
  }

  if (topics.length < HEALTH_TOPIC_LIMIT && source.summary.vitals?.restingHeartRateBpm !== null) {
    topics.push(`安静時心拍 ${source.summary.vitals.restingHeartRateBpm}bpm`);
  }

  if (topics.length < HEALTH_TOPIC_LIMIT && source.summary.vitals?.averageHeartRateBpm !== null) {
    topics.push(`平均心拍 ${source.summary.vitals.averageHeartRateBpm}bpm`);
  }

  return topics.slice(0, HEALTH_TOPIC_LIMIT);
}
