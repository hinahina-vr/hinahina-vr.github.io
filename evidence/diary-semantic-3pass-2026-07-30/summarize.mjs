import fs from "node:fs";

const ledgerLines = fs
  .readFileSync(new URL("./coverage.tsv", import.meta.url), "utf8")
  .trim()
  .split(/\r?\n/);
const header = ledgerLines[0].split("\t");
const rows = ledgerLines.slice(1).map((line) => line.split("\t"));

for (const [index, row] of rows.entries()) {
  if (row.length !== header.length) {
    throw new Error(`coverage.tsv:${index + 2} has ${row.length} columns; expected ${header.length}`);
  }
}

function countColumn(index) {
  return Object.fromEntries(
    [...new Set(rows.map((row) => row[index]))]
      .sort()
      .map((value) => [value, rows.filter((row) => row[index] === value).length]),
  );
}

const counts = {
  rows: rows.length,
  pass1: countColumn(2),
  pass2: countColumn(3),
  pass3: countColumn(4),
  overall: countColumn(5),
};
const summary = JSON.parse(
  fs.readFileSync(new URL("./summary.json", import.meta.url), "utf8"),
);

const expectedOverall = Object.fromEntries(
  Object.entries(summary.overall)
    .filter(([key]) => ["pass", "warn", "fail"].includes(key))
    .map(([key, value]) => [key.toUpperCase(), value]),
);

if (summary.scope.entries !== rows.length) {
  throw new Error(`summary entry count ${summary.scope.entries} does not match ledger ${rows.length}`);
}

if (
  Object.keys(expectedOverall).some(
    (status) => expectedOverall[status] !== (counts.overall[status] ?? 0),
  )
) {
  throw new Error("summary overall counts do not match coverage.tsv");
}

console.log(JSON.stringify({ validation: "passed", ...counts }, null, 2));
