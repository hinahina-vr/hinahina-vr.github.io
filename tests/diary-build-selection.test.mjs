import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repo = path.resolve(import.meta.dirname, "..");
const fixtureParent = path.join(repo, ".local");

test("selected-date builds preserve historical output and full builds retain their behavior", async (t) => {
  fs.mkdirSync(fixtureParent, { recursive: true });
  const fixture = fs.mkdtempSync(path.join(fixtureParent, "diary-build-selection-"));
  t.after(() => {
    const resolved = path.resolve(fixture);
    assert.ok(resolved.startsWith(`${path.resolve(fixtureParent)}${path.sep}`));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  fs.mkdirSync(path.join(fixture, "scripts"));
  fs.cpSync(path.join(repo, "scripts/lib"), path.join(fixture, "scripts/lib"), { recursive: true });
  for (const name of ["build-diary.mjs", "build-diary-roju.mjs"]) {
    fs.copyFileSync(path.join(repo, "scripts", name), path.join(fixture, "scripts", name));
  }
  const dates = ["2026-07-31", "2026-08-10", "2026-08-11"];
  for (const directory of ["diary", "diary-hinahina", "diary-roju"]) {
    fs.mkdirSync(path.join(fixture, directory));
    for (const date of dates) {
      fs.writeFileSync(path.join(fixture, directory, `${date}_記憶.md`), `# ${date} 記憶\n\n${directory} ${date} の本文。\n`);
    }
  }
  const run = (script, args = []) => spawnSync(process.execPath, [path.join(fixture, "scripts", script), ...args], {
    cwd: fixture,
    encoding: "utf8",
    env: {
      ...process.env,
      // These fixtures exercise real file output, not editorial quality.
      WADDY_SKIP_CHARACTER_VOICE_CHECK: "1",
      WADDY_SKIP_DIARY_SOURCE_CHECK: "1",
      WADDY_SKIP_DIARY_BOILERPLATE_CHECK: "1",
    },
  });
  const pass = (result) => assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const read = (name) => fs.readFileSync(path.join(fixture, name), "utf8");
  const oldBundle = "diary-voices-2026-08-10.html";
  const selectedBundle = "diary-voices-2026-08-11.html";
  const staleBundle = "diary-voices-1999-01-01.html";
  const historical = ["diary-2026-07.html", oldBundle, staleBundle];

  await t.test("full build creates all archives and date bundles", () => {
    pass(run("build-diary.mjs"));
    pass(run("build-diary-roju.mjs"));
    for (const date of dates) assert.ok(fs.existsSync(path.join(fixture, `diary-voices-${date}.html`)));
    assert.match(read("diary-2026-07.html"), /2026-07-31/);
  });

  await t.test("selected build writes the new bundle while retaining all historical inputs and files", () => {
    for (const file of historical) fs.writeFileSync(path.join(fixture, file), `preserve: ${file}`);
    fs.writeFileSync(path.join(fixture, selectedBundle), "replace this selected bundle");
    pass(run("build-diary.mjs", ["--dates", "2026-08-11"]));
    for (const file of historical) assert.equal(read(file), `preserve: ${file}`);
    assert.match(read(selectedBundle), /diary-hinahina 2026-08-11/);
    assert.match(read("diary.html"), /2026-08-10/);
    assert.match(read("diary.html"), /diary-2026-07\.html#2026-07-31/);
  });

  await t.test("roju selected build leaves older monthly pages untouched", () => {
    fs.writeFileSync(path.join(fixture, "diary-roju-2026-07.html"), "preserve roju July");
    pass(run("build-diary-roju.mjs", ["--dates", "2026-08-11"]));
    assert.equal(read("diary-roju-2026-07.html"), "preserve roju July");
    assert.match(read("diary-roju.html"), /2026-08-10/);
    assert.match(read("diary-roju.html"), /2026-08-11/);
    assert.match(read("diary-roju.html"), /diary-roju-2026-07\.html/);
  });

  await t.test("an explicitly selected historical month is regenerated", () => {
    pass(run("build-diary.mjs", ["--dates", "2026-07-31,2026-08-11"]));
    assert.match(read("diary-2026-07.html"), /diary 2026-07-31/);
    assert.equal(read(oldBundle), `preserve: ${oldBundle}`);
  });

  await t.test("invalid or missing dates fail before writing output", () => {
    const before = read("diary.html");
    for (const args of [["--dates", ""], ["--dates", "2026-02-30"], ["--dates", "2026-08-12"], ["--date", "2026-08-11"]]) {
      assert.notEqual(run("build-diary.mjs", args).status, 0);
      assert.equal(read("diary.html"), before);
    }
  });

  await t.test("month rollover refuses a partial build rather than leaving old navigation broken", () => {
    const september = path.join(fixture, "diary", "2026-09-01_新月.md");
    fs.writeFileSync(september, "# 2026-09-01 新月\n\n新しい月。\n");
    const before = read("diary.html");
    const result = run("build-diary.mjs", ["--dates", "2026-09-01"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /month rollover/);
    assert.equal(read("diary.html"), before);
    fs.unlinkSync(september);
  });

  await t.test("no-argument build still rebuilds history and deletes stale bundles", () => {
    pass(run("build-diary.mjs"));
    pass(run("build-diary-roju.mjs"));
    assert.match(read(oldBundle), /diary-hinahina 2026-08-10/);
    assert.match(read("diary-roju-2026-07.html"), /2026-07-31/);
    assert.equal(fs.existsSync(path.join(fixture, staleBundle)), false);
  });
});

test("selected build validates selected voices while preserving failures for changed and historical voices", (t) => {
  fs.mkdirSync(fixtureParent, { recursive: true });
  const fixture = fs.mkdtempSync(path.join(fixtureParent, "diary-build-voice-scope-"));
  t.after(() => {
    const resolved = path.resolve(fixture);
    assert.ok(resolved.startsWith(`${path.resolve(fixtureParent)}${path.sep}`));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  fs.mkdirSync(path.join(fixture, "scripts"));
  fs.cpSync(path.join(repo, "scripts/lib"), path.join(fixture, "scripts/lib"), { recursive: true });
  fs.copyFileSync(path.join(repo, "scripts/build-diary.mjs"), path.join(fixture, "scripts/build-diary.mjs"));
  fs.mkdirSync(path.join(fixture, "diary"));
  fs.writeFileSync(path.join(fixture, "diary/2026-08-10_履歴.md"), "# 2026-08-10 履歴\n\n以前の本文。\n");
  fs.writeFileSync(path.join(fixture, "diary/2026-08-19_今回.md"), "# 2026-08-19 今回\n\n今回の本文。\n");
  let hinaPath;
  for (const dir of fs.readdirSync(repo).filter(name => name.startsWith("diary-") && fs.statSync(path.join(repo, name)).isDirectory())) {
    const file = fs.readdirSync(path.join(repo, dir)).find(name => name.startsWith("2026-08-19_") && name.endsWith(".md"));
    assert.ok(file, `missing real authored fixture: ${dir}`);
    fs.mkdirSync(path.join(fixture, dir));
    const dest = path.join(fixture, dir, file);
    fs.copyFileSync(path.join(repo, dir, file), dest);
    if (dir === "diary-hina") hinaPath = dest;
  }
  const env = { ...process.env };
  delete env.WADDY_SKIP_CHARACTER_VOICE_CHECK;
  delete env.WADDY_SKIP_DIARY_SOURCE_CHECK;
  delete env.WADDY_SKIP_DIARY_BOILERPLATE_CHECK;
  const run = args => spawnSync(process.execPath, [path.join(fixture, "scripts/build-diary.mjs"), ...args], { cwd: fixture, encoding: "utf8", env });
  const selected = run(["--dates", "2026-08-19"]);
  assert.equal(selected.status, 0, selected.stdout + selected.stderr);
  assert.match(selected.stdout, /character voice check passed \(1 dates: 33 entries\)/);
  const output = path.join(fixture, "diary.html");
  const before = fs.readFileSync(output, "utf8");
  const originalHina = fs.readFileSync(hinaPath, "utf8");
  fs.writeFileSync(hinaPath, originalHina.replace(/\r?\n\r?\n/, "\n\nひなは敬語で話します。\n\n"));
  const invalidSelected = run(["--dates", "2026-08-19"]);
  assert.notEqual(invalidSelected.status, 0);
  assert.match(invalidSelected.stderr, /敬語/);
  assert.equal(fs.readFileSync(output, "utf8"), before);
  fs.writeFileSync(hinaPath, originalHina);
  const full = run([]);
  assert.notEqual(full.status, 0);
  assert.match(full.stderr, /2026-08-10/);
});
