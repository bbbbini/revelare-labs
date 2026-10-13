"use strict";

// Creates the private folder layout outside the repository and a runtime token.
// Safe to re-run: existing files (token, config) are kept.

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const {
  DEFAULT_PROVIDER,
  RESEARCHERS,
  assertOutsideRepo,
  researcherWorkdir,
  resolvePaths,
  resolvePrivateRoot,
} = require("./config");

const PRIVATE_DIRS = [
  "runtime",
  "researchers",
  "research",
  "drafts",
  "evidence",
  "hermes3d-state",
];

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true, mode: 0o700 });

const writeIfMissing = (file, content, mode) => {
  try {
    fs.writeFileSync(file, content, { flag: "wx", mode });
    return true;
  } catch (error) {
    if (error && error.code === "EEXIST") return false;
    throw error;
  }
};

const initPrivate = (env = process.env, { repoRoot } = {}) => {
  const privateRoot = resolvePrivateRoot(env);
  const paths = resolvePaths(privateRoot);
  const dirs = [
    privateRoot,
    ...PRIVATE_DIRS.map((name) => path.join(privateRoot, name)),
    ...RESEARCHERS.map((researcher) => researcherWorkdir(paths, researcher.id)),
  ];
  // Every directory and file this writes is checked before anything is
  // created, so a symlink anywhere under the private root cannot redirect the
  // token or config into the repository. Re-checked after the directories
  // exist, right before the files are written.
  const targets = [...dirs, paths.tokenFile, paths.configFile];
  const checkAll = () => targets.forEach((target) => assertOutsideRepo(target, repoRoot));
  checkAll();
  for (const dir of dirs) ensureDir(dir);
  fs.chmodSync(privateRoot, 0o700);
  checkAll();

  const createdToken = writeIfMissing(paths.tokenFile, `${crypto.randomBytes(32).toString("hex")}\n`, 0o600);
  fs.chmodSync(paths.tokenFile, 0o600);
  const defaultConfig = {
    researchers: Object.fromEntries(RESEARCHERS.map((r) => [r.id, { provider: DEFAULT_PROVIDER }])),
  };
  const createdConfig = writeIfMissing(paths.configFile, `${JSON.stringify(defaultConfig, null, 2)}\n`, 0o600);
  return { paths, createdToken, createdConfig };
};

if (require.main === module) {
  try {
    const { createdToken, createdConfig } = initPrivate();
    // Paths and the token are intentionally not printed.
    console.info(
      `[labs-runtime] private folders ready (token ${createdToken ? "created" : "kept"}, config ${createdConfig ? "created" : "kept"}).`,
    );
  } catch (error) {
    console.error(`[labs-runtime] ${error.message}`);
    process.exit(1);
  }
}

module.exports = { PRIVATE_DIRS, initPrivate };
