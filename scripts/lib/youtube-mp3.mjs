import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import YTDlpWrap from "yt-dlp-wrap";

export const ROOT_DIR = resolve(import.meta.dirname, "..", "..");
export const OUTPUT_FILENAME_TEMPLATE = "%(title)s [%(id)s].%(ext)s";

export function getDefaultOutputDir(rootDir = ROOT_DIR) {
  return join(rootDir, ".local", "youtube-mp3");
}

export function getDefaultYtDlpBinaryPath(rootDir = ROOT_DIR, platform = process.platform) {
  return join(rootDir, ".local", "tools", "yt-dlp", platform === "win32" ? "yt-dlp.exe" : "yt-dlp");
}

function resolvePathOrCommand(rootDir, value) {
  if (!value) return value;
  if (/^[A-Za-z]:[\\/]/.test(value) || value.startsWith("\\") || value.startsWith("/")) {
    return value;
  }
  if (value.includes("\\") || value.includes("/") || value.startsWith(".")) {
    return resolve(rootDir, value);
  }
  return value;
}

function expectValue(argv, index, optionName) {
  const value = argv[index + 1];
  if (!value) {
    throw new Error(`${optionName} requires a value`);
  }
  return value;
}

export function parseArgs(
  argv,
  { rootDir = ROOT_DIR, platform = process.platform } = {}
) {
  const urls = [];
  let outputDir = getDefaultOutputDir(rootDir);
  let ffmpegPath = "ffmpeg";
  let updateYtDlp = false;
  let help = false;

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "-h" || arg === "--help") {
      help = true;
      continue;
    }

    if (arg === "--output-dir") {
      outputDir = resolve(rootDir, expectValue(argv, index, "--output-dir"));
      index += 1;
      continue;
    }

    if (arg === "--ffmpeg-bin") {
      ffmpegPath = resolvePathOrCommand(rootDir, expectValue(argv, index, "--ffmpeg-bin"));
      index += 1;
      continue;
    }

    if (arg === "--update-yt-dlp") {
      updateYtDlp = true;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    urls.push(arg);
  }

  if (!help && urls.length === 0) {
    throw new Error("At least one YouTube URL is required");
  }

  return {
    help,
    urls,
    outputDir,
    ffmpegPath,
    binaryPath: getDefaultYtDlpBinaryPath(rootDir, platform),
    updateYtDlp,
  };
}

export function renderHelpText(scriptName = "node scripts/download-youtube-mp3.mjs") {
  return [
    "YouTube URL から音声を mp3 として保存します。",
    "",
    `Usage: ${scriptName} [options] <youtube-url> [more-urls...]`,
    "",
    "Options:",
    `  --output-dir <path>  保存先ディレクトリ (default: ${getDefaultOutputDir()})`,
    "  --ffmpeg-bin <path>  ffmpeg 実行ファイル or PATH 上のコマンド名",
    "  --update-yt-dlp      yt-dlp バイナリを最新で再取得してから実行",
    "  -h, --help           ヘルプを表示",
  ].join("\n");
}

function formatErrorDetails(error) {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;

  const parts = [];
  if (error.message) {
    parts.push(error.message);
  }
  if (typeof error.stderr === "string" && error.stderr.trim()) {
    parts.push(error.stderr.trim());
  }
  if (typeof error.stdout === "string" && error.stdout.trim()) {
    parts.push(error.stdout.trim());
  }

  return parts.join("\n").trim() || String(error);
}

function runProcess(command, args) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "ignore", "pipe"],
    });

    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      rejectPromise(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(new Error(stderr.trim() || `${command} exited with code ${code}`));
    });
  });
}

export async function ensureFfmpegAvailable(ffmpegPath = "ffmpeg") {
  try {
    await runProcess(ffmpegPath, ["-version"]);
  } catch (error) {
    throw new Error(
      `ffmpeg could not be executed (${ffmpegPath}). Install ffmpeg or pass --ffmpeg-bin.\n${formatErrorDetails(error)}`
    );
  }
}

export async function ensureYtDlpBinary(binaryPath, { forceDownload = false } = {}) {
  if (!forceDownload) {
    try {
      await access(binaryPath, constants.F_OK);
      return binaryPath;
    } catch {
      // Download below.
    }
  }

  await mkdir(dirname(binaryPath), { recursive: true });
  await YTDlpWrap.downloadFromGithub(binaryPath);
  await access(binaryPath, constants.F_OK);
  return binaryPath;
}

export function buildDownloadArgs({ url, outputDir, ffmpegPath = "ffmpeg" }) {
  return [
    url,
    "--extract-audio",
    "--audio-format",
    "mp3",
    "--audio-quality",
    "0",
    "--format",
    "bestaudio/best",
    "--no-playlist",
    "--windows-filenames",
    "--ffmpeg-location",
    ffmpegPath,
    "--output",
    join(outputDir, OUTPUT_FILENAME_TEMPLATE),
    "--print",
    "after_move:filepath",
  ];
}

function normalizePrintedFilePath(outputDir, line) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (/^[A-Za-z]:[\\/]/.test(trimmed) || trimmed.startsWith("\\") || trimmed.startsWith("/")) {
    return trimmed;
  }
  return resolve(outputDir, trimmed);
}

export async function downloadYoutubeMp3({
  urls,
  outputDir,
  binaryPath,
  ffmpegPath = "ffmpeg",
  updateYtDlp = false,
  logger = console,
}) {
  await mkdir(outputDir, { recursive: true });
  await ensureFfmpegAvailable(ffmpegPath);
  await ensureYtDlpBinary(binaryPath, { forceDownload: updateYtDlp });

  logger.log(`Output directory: ${outputDir}`);
  logger.log(`yt-dlp binary: ${binaryPath}`);

  const ytDlp = new YTDlpWrap(binaryPath);
  const downloadedFiles = [];

  for (const url of urls) {
    logger.log(`Downloading ${url}`);

    let stdout;
    try {
      stdout = await ytDlp.execPromise(buildDownloadArgs({ url, outputDir, ffmpegPath }));
    } catch (error) {
      throw new Error(`yt-dlp failed for ${url}\n${formatErrorDetails(error)}`);
    }

    const files = stdout
      .split(/\r?\n/)
      .map((line) => normalizePrintedFilePath(outputDir, line))
      .filter(Boolean);

    if (!files.length) {
      throw new Error(`yt-dlp finished but did not report an output file for ${url}`);
    }

    downloadedFiles.push(...files);
    for (const filePath of files) {
      logger.log(`Saved ${filePath}`);
    }
  }

  return downloadedFiles;
}
