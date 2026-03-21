import assert from "node:assert/strict";
import { join } from "node:path";
import {
  buildDownloadArgs,
  getDefaultOutputDir,
  getDefaultYtDlpBinaryPath,
  parseArgs,
} from "../scripts/lib/youtube-mp3.mjs";

const ROOT_DIR = "C:\\repo\\waddy-guesthouse-90s";
const URL = "https://www.youtube.com/watch?v=example123";

function testParseArgsDefaults() {
  const options = parseArgs(["node", "script", URL], {
    rootDir: ROOT_DIR,
    platform: "win32",
  });

  assert.equal(options.help, false);
  assert.deepEqual(options.urls, [URL]);
  assert.equal(options.outputDir, getDefaultOutputDir(ROOT_DIR));
  assert.equal(options.binaryPath, getDefaultYtDlpBinaryPath(ROOT_DIR, "win32"));
  assert.equal(options.ffmpegPath, "ffmpeg");
  assert.equal(options.updateYtDlp, false);
}

function testParseArgsOverrides() {
  const options = parseArgs(
    [
      "node",
      "script",
      "--output-dir",
      ".tmp/music",
      "--ffmpeg-bin",
      ".local/bin/ffmpeg.exe",
      "--update-yt-dlp",
      URL,
    ],
    {
      rootDir: ROOT_DIR,
      platform: "win32",
    }
  );

  assert.equal(options.outputDir, join(ROOT_DIR, ".tmp", "music"));
  assert.equal(options.ffmpegPath, join(ROOT_DIR, ".local", "bin", "ffmpeg.exe"));
  assert.equal(options.updateYtDlp, true);
}

function testBuildDownloadArgs() {
  const args = buildDownloadArgs({
    url: URL,
    outputDir: getDefaultOutputDir(ROOT_DIR),
    ffmpegPath: "ffmpeg",
  });

  assert.equal(args[0], URL);
  assert(args.includes("--extract-audio"));
  assert(args.includes("--audio-format"));
  assert(args.includes("mp3"));
  assert(args.includes("--print"));
  assert.equal(args.at(-1), "after_move:filepath");
  assert.equal(
    args[args.indexOf("--output") + 1],
    join(getDefaultOutputDir(ROOT_DIR), "%(title)s [%(id)s].%(ext)s")
  );
}

function run() {
  testParseArgsDefaults();
  testParseArgsOverrides();
  testBuildDownloadArgs();
  console.log("youtube mp3 tests passed");
}

run();
