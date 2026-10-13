"use strict";

// Labs Runtime configuration. Everything private (token, config, CLI working
// directories) lives outside the repository under the private root.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const RUNTIME_HOST = "127.0.0.1";
const DEFAULT_PORT = 7770;
const PROVIDER_IDS = ["claude", "codex"];
const DEFAULT_PROVIDER = "claude";
const RESEARCHERS = [{ id: "researcher-1", name: "보안 연구원" }];

const DEFAULT_LIMITS = Object.freeze({
  cliTimeoutMs: 180_000,
  maxOutputBytes: 64 * 1024,
  maxPromptChars: 32_000,
  maxRequestBytes: 256 * 1024,
  maxConcurrency: 1,
  maxQueueLength: 4,
});

const resolvePrivateRoot = (env = process.env) => {
  const override = String(env.LABS_PRIVATE_DIR ?? "").trim();
  if (override) return path.resolve(override.replace(/^~(?=$|[\\/])/, os.homedir()));
  return path.join(os.homedir(), "security-labs-private");
};

const REPO_ROOT = path.resolve(__dirname, "..");

// Private data must never live inside the (public) repository. A sibling name
// such as "..private" is still inside, so compare path segments, not prefixes.
const isOutside = (target, root) => {
  const relative = path.relative(root, target);
  if (!relative) return false;
  return relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative);
};

// Resolves symlinks in the longest existing prefix of `target`, so a path that
// does not exist yet is still checked against where it would really land.
const realpathOfNearestExisting = (target) => {
  let existing = path.resolve(target);
  const rest = [];
  while (!fs.existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) break;
    rest.unshift(path.basename(existing));
    existing = parent;
  }
  return path.join(fs.realpathSync(existing), ...rest);
};

// Private data must never live inside the (public) repository. Compares path
// segments (a child named "..private" is still inside) and real paths (a
// symlink pointing into the repository is inside).
const assertOutsideRepo = (privateRoot, repoRoot = REPO_ROOT) => {
  repoRoot = repoRoot ?? REPO_ROOT;
  const lexicalOk = isOutside(path.resolve(privateRoot), path.resolve(repoRoot));
  const realOk = isOutside(realpathOfNearestExisting(privateRoot), realpathOfNearestExisting(repoRoot));
  if (!lexicalOk || !realOk) {
    throw new Error("The private directory must be outside the repository.");
  }
};

const resolvePaths = (privateRoot) => ({
  privateRoot,
  runtimeDir: path.join(privateRoot, "runtime"),
  tokenFile: path.join(privateRoot, "runtime", "token"),
  configFile: path.join(privateRoot, "runtime", "config.json"),
  researchersDir: path.join(privateRoot, "researchers"),
});

const researcherWorkdir = (paths, researcherId) =>
  path.join(paths.researchersDir, researcherId, "workdir");

const readJsonIfExists = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw new Error(`Invalid JSON in ${path.basename(file)}: ${error.message}`);
  }
};

const normalizeProvider = (value, source) => {
  const provider = String(value ?? "").trim().toLowerCase();
  if (!provider) return null;
  if (!PROVIDER_IDS.includes(provider)) {
    throw new Error(`Unknown provider "${provider}" in ${source}. Use one of: ${PROVIDER_IDS.join(", ")}.`);
  }
  return provider;
};

const positiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const readToken = (tokenFile) => {
  let token;
  try {
    token = fs.readFileSync(tokenFile, "utf8").trim();
  } catch (error) {
    if (error && error.code === "ENOENT") {
      throw new Error("Runtime token not found. Run `npm run labs-runtime:init` first.");
    }
    throw error;
  }
  if (token.length < 32) throw new Error("Runtime token is too short; re-run init.");
  return token;
};

// Provider precedence: LABS_PROVIDER env > private config.json > default (claude).
const loadConfig = (env = process.env, { repoRoot } = {}) => {
  const privateRoot = resolvePrivateRoot(env);
  const paths = resolvePaths(privateRoot);
  for (const target of [privateRoot, paths.tokenFile, paths.configFile]) {
    assertOutsideRepo(target, repoRoot);
  }
  const fileConfig = readJsonIfExists(paths.configFile) ?? {};
  const fileLimits = fileConfig.limits ?? {};
  const limits = {};
  for (const [key, fallback] of Object.entries(DEFAULT_LIMITS)) {
    limits[key] = positiveInt(fileLimits[key], fallback);
  }
  const researchers = RESEARCHERS.map((researcher) => {
    const fromFile = fileConfig.researchers?.[researcher.id]?.provider;
    const provider =
      normalizeProvider(env.LABS_PROVIDER, "LABS_PROVIDER") ??
      normalizeProvider(fromFile, "config.json") ??
      DEFAULT_PROVIDER;
    const workdir = researcherWorkdir(paths, researcher.id);
    assertOutsideRepo(workdir, repoRoot);
    return { ...researcher, provider, workdir };
  });
  return {
    host: RUNTIME_HOST,
    port: positiveInt(env.LABS_RUNTIME_PORT, DEFAULT_PORT),
    paths,
    limits,
    researchers,
    token: readToken(paths.tokenFile),
  };
};

module.exports = {
  DEFAULT_LIMITS,
  DEFAULT_PORT,
  DEFAULT_PROVIDER,
  PROVIDER_IDS,
  RESEARCHERS,
  RUNTIME_HOST,
  assertOutsideRepo,
  loadConfig,
  readToken,
  researcherWorkdir,
  resolvePaths,
  resolvePrivateRoot,
};
