import fs from "node:fs";
import path from "node:path";

const defaultPath = path.resolve(import.meta.dirname, "../../data/diary-writing-models.json");

export function readWritingModels(file = defaultPath) {
  if (!fs.existsSync(file)) return {};
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (data.schemaVersion !== 1 || !data.dates || typeof data.dates !== "object") {
    throw new Error("Invalid diary writing-model metadata");
  }
  return data.dates;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

export function renderWritingModel(date, models) {
  const record = models[date];
  if (!record) return '<p class="diary-writing-model">使用LLM：未記録</p>';
  if (!record.model || !record.label || !record.scope || !/^\d{4}-\d{2}-\d{2}$/.test(record.revisedOn)) {
    throw new Error(`Incomplete diary writing-model metadata: ${date}`);
  }
  return `<p class="diary-writing-model">使用LLM：${escapeHtml(record.label)}（${escapeHtml(record.model)}）<br><small>${escapeHtml(record.scope)} · 改稿日：${escapeHtml(record.revisedOn)}</small></p>`;
}
