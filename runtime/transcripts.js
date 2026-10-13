"use strict";

// Per-session chat transcripts for one researcher, kept in the private folder
// outside the repository so a browser reload can restore the conversation.
// File names are hashes of the session id, so a session id can never choose
// a path. Every path is checked against the repository (real paths) before use.

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const { assertOutsideRepo } = require("./config");

const TRANSCRIPT_LIMITS = Object.freeze({
  maxMessages: 200,
  maxBytes: 1024 * 1024,
  // A single message is cut to this many characters (at most 3 bytes each in
  // UTF-8 for Korean), so even one oversized message fits within maxBytes.
  maxMessageChars: 200_000,
  maxSessionIdChars: 200,
});

const TRUNCATION_NOTE = "\n…(저장 한도를 넘어 뒷부분은 저장하지 않았습니다)";

const ROLES = new Set(["user", "assistant"]);

const sessionsDirFor = (paths, researcherId) =>
  path.join(paths.researchersDir, researcherId, "sessions");

// Session ids look like "agent:<researcher-id>:<name>". Only this researcher's
// sessions are accepted, which keeps each researcher's transcripts separate.
const isValidSessionId = (sessionId, researcherId) =>
  typeof sessionId === "string" &&
  sessionId.length > 0 &&
  sessionId.length <= TRANSCRIPT_LIMITS.maxSessionIdChars &&
  sessionId.startsWith(`agent:${researcherId}:`) &&
  /^[A-Za-z0-9._:-]+$/.test(sessionId);

const fileNameFor = (sessionId) =>
  `${crypto.createHash("sha256").update(sessionId, "utf8").digest("hex").slice(0, 40)}.json`;

const createTranscriptStore = ({ paths, researcherId, repoRoot, now = Date.now } = {}) => {
  const dir = sessionsDirFor(paths, researcherId);

  const ensureDir = () => {
    assertOutsideRepo(dir, repoRoot);
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    assertOutsideRepo(dir, repoRoot);
  };

  const fileFor = (sessionId) => {
    const file = path.join(dir, fileNameFor(sessionId));
    assertOutsideRepo(file, repoRoot);
    return file;
  };

  const read = (sessionId) => {
    if (!isValidSessionId(sessionId, researcherId)) {
      throw Object.assign(new Error("Invalid session id."), { code: "bad_session" });
    }
    const file = fileFor(sessionId);
    let raw;
    try {
      raw = fs.readFileSync(file, "utf8");
    } catch (error) {
      if (error && error.code === "ENOENT") return { messages: [], truncated: false };
      throw error;
    }
    const parsed = JSON.parse(raw);
    if (parsed?.sessionId !== sessionId || !Array.isArray(parsed.messages)) {
      throw Object.assign(new Error("Transcript file does not match the session."), {
        code: "bad_transcript",
      });
    }
    return { messages: parsed.messages, truncated: Boolean(parsed.truncated) };
  };

  // Writes through a temporary file and a rename, so a crash never leaves a
  // half-written transcript. Oldest messages are dropped past the limits and
  // the transcript is marked truncated.
  const write = (sessionId, messages, truncatedBefore) => {
    ensureDir();
    let truncated = truncatedBefore || messages.length > TRANSCRIPT_LIMITS.maxMessages;
    let kept = messages.slice(-TRANSCRIPT_LIMITS.maxMessages).map((message) => {
      if (message.content.length <= TRANSCRIPT_LIMITS.maxMessageChars) return message;
      truncated = true;
      return {
        ...message,
        content: message.content.slice(0, TRANSCRIPT_LIMITS.maxMessageChars) + TRUNCATION_NOTE,
      };
    });
    const serialize = () =>
      JSON.stringify({ version: 1, sessionId, updatedAt: now(), truncated, messages: kept });
    let payload = serialize();
    while (Buffer.byteLength(payload) > TRANSCRIPT_LIMITS.maxBytes && kept.length > 1) {
      kept = kept.slice(Math.ceil(kept.length / 4));
      truncated = true;
      payload = serialize();
    }
    if (Buffer.byteLength(payload) > TRANSCRIPT_LIMITS.maxBytes) {
      throw Object.assign(new Error("Transcript exceeds the size limit."), { code: "too_large" });
    }
    const file = fileFor(sessionId);
    const tmp = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
    assertOutsideRepo(tmp, repoRoot);
    fs.writeFileSync(tmp, payload, { mode: 0o600, flag: "wx" });
    fs.renameSync(tmp, file);
    return { saved: kept.length, truncated };
  };

  const append = (sessionId, entries) => {
    const current = read(sessionId);
    const next = entries
      .filter((entry) => ROLES.has(entry.role) && typeof entry.content === "string" && entry.content)
      .map((entry) => ({ role: entry.role, content: entry.content, timestamp: entry.timestamp ?? now() }));
    return write(sessionId, [...current.messages, ...next], current.truncated);
  };

  // "New session" keeps the old transcript under a unique archive name instead
  // of deleting it; a fresh, empty transcript follows. linkSync fails rather
  // than replace an existing archive, so repeated resets never overwrite one.
  const reset = (sessionId) => {
    if (!isValidSessionId(sessionId, researcherId)) {
      throw Object.assign(new Error("Invalid session id."), { code: "bad_session" });
    }
    const file = fileFor(sessionId);
    if (!fs.existsSync(file)) return { archived: false };
    const archive = file.replace(/\.json$/, `.reset-${now()}-${crypto.randomUUID()}.json`);
    assertOutsideRepo(archive, repoRoot);
    fs.linkSync(file, archive);
    fs.unlinkSync(file);
    return { archived: true };
  };

  return { append, read, reset, dir };
};

module.exports = { TRANSCRIPT_LIMITS, createTranscriptStore, isValidSessionId, sessionsDirFor };
