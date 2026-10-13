"use strict";

// CLI providers. Each one runs a logged-in subscription CLI (no API keys) with
// the prompt on stdin, in the researcher's private working directory, under a
// timeout and an output size cap.

const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

// API keys would switch the CLIs to metered API billing; strip them so only
// the subscription login is used. CLAUDECODE marks a nested Claude Code session.
const STRIPPED_ENV_KEYS = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_AUTH_TOKEN",
  "OPENAI_API_KEY",
  "CODEX_API_KEY",
  "CLAUDECODE",
];

const buildCliEnv = (baseEnv = process.env) => {
  const env = { ...baseEnv };
  for (const key of STRIPPED_ENV_KEYS) delete env[key];
  return env;
};

class CliError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const runCli = ({
  command,
  args,
  input,
  cwd,
  env,
  timeoutMs,
  maxOutputBytes,
  signal,
  spawnImpl = spawn,
}) =>
  new Promise((resolve, reject) => {
    // Already cancelled: do not start a CLI at all.
    if (signal?.aborted) {
      reject(new CliError("aborted", "Request was cancelled."));
      return;
    }
    let child;
    try {
      child = spawnImpl(command, args, { cwd, env, stdio: ["pipe", "pipe", "pipe"] });
    } catch (error) {
      reject(new CliError("spawn_failed", `Could not start ${command}: ${error.message}`));
      return;
    }
    const chunks = [];
    let outputBytes = 0;
    let stderrTail = "";
    let settled = false;
    // Set when we stop the child ourselves. The promise only settles once the
    // child has exited, so the queue never starts the next CLI run while the
    // previous one is still alive.
    let stopError = null;
    let killTimer = null;

    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(killTimer);
      if (signal) signal.removeEventListener("abort", onAbort);
      if (error) reject(error);
      else resolve(value);
    };
    const stop = (error) => {
      if (stopError || settled) return;
      stopError = error;
      try {
        child.kill("SIGTERM");
      } catch {
        // already gone
      }
      killTimer = setTimeout(() => {
        try {
          child.kill("SIGKILL");
        } catch {
          // already gone
        }
      }, 2_000);
    };
    const onAbort = () => stop(new CliError("aborted", "Request was cancelled."));
    const timer = setTimeout(() => {
      stop(new CliError("timeout", `${command} timed out after ${Math.round(timeoutMs / 1000)}s.`));
    }, timeoutMs);
    if (signal) signal.addEventListener("abort", onAbort);

    child.stdout.on("data", (chunk) => {
      if (stopError) return;
      outputBytes += chunk.length;
      if (outputBytes > maxOutputBytes) {
        stop(new CliError("output_too_large", `${command} output exceeded ${maxOutputBytes} bytes.`));
        return;
      }
      chunks.push(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderrTail = (stderrTail + chunk.toString("utf8")).slice(-2_000);
    });
    child.on("error", (error) => {
      finish(new CliError("spawn_failed", `Could not start ${command}: ${error.message}`));
    });
    child.on("close", (code) => {
      if (stopError) {
        finish(stopError);
        return;
      }
      if (code !== 0) {
        const error = new CliError("exit_nonzero", `${command} exited with code ${code}.`);
        error.stderrTail = stderrTail;
        finish(error);
        return;
      }
      finish(null, Buffer.concat(chunks).toString("utf8"));
    });
    child.stdin.on("error", () => {});
    child.stdin.end(input);
  });

const claudeProvider = {
  id: "claude",
  modelId: "claude-cli",
  label: "Claude (claude -p)",
  async complete({ prompt, cwd, limits, signal, spawnImpl, env }) {
    const output = await runCli({
      command: "claude",
      // No tools and no MCP servers: Phase 1 researchers only answer questions.
      args: ["-p", "--output-format", "text", "--tools", "", "--strict-mcp-config", "--no-session-persistence"],
      input: prompt,
      cwd,
      env: buildCliEnv(env),
      timeoutMs: limits.cliTimeoutMs,
      maxOutputBytes: limits.maxOutputBytes,
      signal,
      spawnImpl,
    });
    return output.trim();
  },
};

const codexProvider = {
  id: "codex",
  modelId: "codex-cli",
  label: "Codex (codex exec)",
  async complete({ prompt, cwd, limits, signal, spawnImpl, env }) {
    // codex prints progress on stdout; read only the final message from a file.
    const lastMessageFile = path.join(cwd, `.codex-last-${crypto.randomUUID()}.txt`);
    try {
      await runCli({
        command: "codex",
        args: [
          "exec",
          "--skip-git-repo-check",
          "--sandbox",
          "read-only",
          "--ephemeral",
          "--color",
          "never",
          "--cd",
          cwd,
          "--output-last-message",
          lastMessageFile,
          "-",
        ],
        input: prompt,
        cwd,
        env: buildCliEnv(env),
        timeoutMs: limits.cliTimeoutMs,
        maxOutputBytes: limits.maxOutputBytes * 4,
        signal,
        spawnImpl,
      });
      const stat = fs.statSync(lastMessageFile);
      if (stat.size > limits.maxOutputBytes) {
        throw new CliError("output_too_large", `codex output exceeded ${limits.maxOutputBytes} bytes.`);
      }
      return fs.readFileSync(lastMessageFile, "utf8").trim();
    } finally {
      fs.rmSync(lastMessageFile, { force: true });
    }
  },
};

const PROVIDERS = { claude: claudeProvider, codex: codexProvider };

const getProvider = (id) => {
  const provider = PROVIDERS[id];
  if (!provider) throw new Error(`Unknown provider "${id}".`);
  return provider;
};

module.exports = { CliError, PROVIDERS, STRIPPED_ENV_KEYS, buildCliEnv, getProvider, runCli };
