import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const collector = fileURLToPath(new URL("./collect-daily-context.mjs", import.meta.url));
const root = fileURLToPath(new URL("..", import.meta.url));

function parseArgs(argv) {
  const options = {
    from: null,
    to: null,
    concurrency: 4,
    skipSwarm: false,
    skipX: false,
    skipHealth: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--from") options.from = argv[++index] ?? null;
    else if (arg === "--to") options.to = argv[++index] ?? null;
    else if (arg === "--concurrency") options.concurrency = Number(argv[++index] ?? 4);
    else if (arg === "--skip-swarm") options.skipSwarm = true;
    else if (arg === "--skip-x") options.skipX = true;
    else if (arg === "--skip-health") options.skipHealth = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.from ?? "")) {
    throw new Error("--from requires YYYY-MM-DD");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.to ?? "")) {
    throw new Error("--to requires YYYY-MM-DD");
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 8) {
    throw new Error("--concurrency must be an integer from 1 to 8");
  }
  return options;
}

function enumerateDates(from, to) {
  const dates = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const last = new Date(`${to}T00:00:00Z`);
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

async function collectDate(date, options) {
  const args = [collector, "--date", date, "--best-effort"];
  if (options.skipHealth) args.push("--skip-health");
  if (options.skipSwarm) args.push("--skip-swarm");
  if (options.skipX) args.push("--skip-x");

  const { stdout, stderr } = await execFileAsync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
  const output = `${stdout}${stderr}`.trim();
  console.log(output || `[daily-context] ${date}: no output`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const queue = enumerateDates(options.from, options.to);
  const failures = [];

  async function worker() {
    while (queue.length > 0) {
      const date = queue.shift();
      try {
        await collectDate(date, options);
      } catch (error) {
        failures.push({ date, message: error.message });
        console.error(`[daily-context-range] ${date}: ${error.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: options.concurrency }, () => worker()));

  if (failures.length > 0) {
    console.error(`[daily-context-range] failures=${failures.length}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
