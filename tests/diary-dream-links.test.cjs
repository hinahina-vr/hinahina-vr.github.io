const fs = require("node:fs");
const path = require("node:path");

const diaryPath = path.join(process.cwd(), "diary.html");
const html = fs.readFileSync(diaryPath, "utf-8");

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed += 1;
  } else {
    console.log(`  FAIL: ${name}`);
    failed += 1;
  }
}

function getEntryBlock(date) {
  const escapedDate = date.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`<li id="${escapedDate}_[^"]*">([\\s\\S]*?)<\\/li>`, "u"));
  return match ? match[0] : "";
}

console.log("\n=== diary dream link regression ===");

const march29 = getEntryBlock("2026-03-29");
const march30 = getEntryBlock("2026-03-30");
const march31 = getEntryBlock("2026-03-31");

assert(march29.length > 0, "2026-03-29 entry exists in diary.html");
assert(march30.length > 0, "2026-03-30 entry exists in diary.html");
assert(march31.length > 0, "2026-03-31 entry exists in diary.html");

assert(march29.includes("夢を見る"), "2026-03-29 keeps the dream button when ADMS exists");
assert(march29.includes("./galge-scenario.html?scenario="), "2026-03-29 dream button points to the scenario runtime");
assert(!march29.includes("./dream-select.html?date=2026-03-29"), "2026-03-29 no longer links to dream-select directly");

assert(!march30.includes("夢を見る"), "2026-03-30 hides the dream button when ADMS is missing");
assert(!march30.includes("./dream-select.html?date=2026-03-30"), "2026-03-30 does not expose a broken dream-select link");

assert(!march31.includes("夢を見る"), "2026-03-31 hides the dream button when ADMS is missing");
assert(!march31.includes("./dream-select.html?date=2026-03-31"), "2026-03-31 does not expose a broken dream-select link");

console.log(`\n=== 結果: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
