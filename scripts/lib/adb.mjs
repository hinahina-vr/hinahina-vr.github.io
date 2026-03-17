import { spawn } from "node:child_process";

function quoteSegment(value) {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (!/[\s"]/.test(stringValue)) return stringValue;
  return `"${stringValue.replace(/"/g, '\\"')}"`;
}

export function buildAdbArgs(baseArgs, serial) {
  return serial ? ["-s", serial, ...baseArgs] : baseArgs;
}

export function runCommand(command, args, options = {}) {
  const {
    cwd,
    timeoutMs = 30000,
    acceptExitCodes = [0],
  } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    let timer = null;

    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (error) reject(error);
      else resolve(result);
    };

    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        child.kill();
        finish(new Error(`Command timed out after ${timeoutMs}ms: ${command} ${args.map(quoteSegment).join(" ")}`));
      }, timeoutMs);
    }

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      finish(error);
    });
    child.on("close", (code) => {
      const exitCode = code ?? 0;
      const result = {
        command,
        args,
        code: exitCode,
        stdout,
        stderr,
      };
      if (acceptExitCodes.includes(exitCode)) {
        finish(null, result);
        return;
      }
      finish(new Error([
        `Command failed with exit code ${exitCode}: ${command} ${args.map(quoteSegment).join(" ")}`,
        stdout.trim() ? `stdout: ${stdout.trim()}` : null,
        stderr.trim() ? `stderr: ${stderr.trim()}` : null,
      ].filter(Boolean).join("\n")));
    });
  });
}
