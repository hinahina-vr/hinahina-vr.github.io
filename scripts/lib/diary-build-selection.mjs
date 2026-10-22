import { existsSync, readFileSync } from "node:fs";

export function parseDiaryBuildDates(argv) {
  if (argv.length === 0) return null;
  if (argv.length !== 2 || argv[0] !== "--dates") {
    throw new Error("Usage: --dates YYYY-MM-DD,YYYY-MM-DD (omit for a full build)");
  }
  const dates = argv[1].split(",").map((date) => date.trim());
  for (const date of dates) {
    const parsed = new Date(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
      throw new Error(`Invalid diary build date: ${date || "(empty)"}`);
    }
  }
  return new Set(dates);
}

// Main diary builds can check explicit dates while regenerating every output.
// Keep the legacy parser unchanged for builders that only select output dates.
export function parseDiaryBuildOptions(argv) {
  if (argv[0] === "--check-dates") {
    if (argv.length !== 2) {
      throw new Error("Usage: --check-dates YYYY-MM-DD,YYYY-MM-DD (cannot combine with --dates)");
    }
    return { selectedDates: null, checkDates: parseDiaryBuildDates(["--dates", argv[1]]) };
  }
  return { selectedDates: parseDiaryBuildDates(argv), checkDates: null };
}

export function validateDiaryCheckDates(dates, entries) {
  if (!dates) return;
  const available = new Set(entries.map((entry) => entry.date));
  for (const date of dates) {
    if (!available.has(date)) throw new Error(`Selected diary does not exist: ${date}`);
  }
}

export function validateDiaryBuildDates(selectedDates, entries, currentPage) {
  if (!selectedDates) return;
  validateDiaryCheckDates(selectedDates, entries);
  // A month rollover changes old bundle/archive navigation, so it needs a full build.
  const latestMonth = entries.map((entry) => entry.month).sort().at(-1);
  if (existsSync(currentPage)) {
    const match = readFileSync(currentPage, "utf8").match(/<h2>(\d{4})年(\d{1,2})月<\/h2>/);
    const previousMonth = match ? `${match[1]}-${match[2].padStart(2, "0")}` : null;
    if (previousMonth && previousMonth !== latestMonth) {
      throw new Error("A month rollover requires a full diary build to update historical navigation.");
    }
  }
}

export function includesDiaryBuildMonth(selectedDates, month) {
  return !selectedDates || [...selectedDates].some((date) => date.startsWith(`${month}-`));
}
