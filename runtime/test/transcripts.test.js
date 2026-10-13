"use strict";

const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { PassThrough } = require("node:stream");
const test = require("node:test");

const { loadConfig } = require("../config");
const { initPrivate } = require("../init-private");
const { createRuntimeServer } = require("../server");
const { TRANSCRIPT_LIMITS, createTranscriptStore, isValidSessionId } = require("../transcripts");

const tmpPrivateRoot = () => fs.mkdtempSync(path.join(os.tmpdir(), "labs-transcripts-test-"));

const replySpawn = (text) => () => {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.stdin = new PassThrough();
  child.exitCode = null;
  child.kill = () => {};
  child.stdin.on("finish", () => {
    child.stdout.write(text);
    child.exitCode = 0;
    child.emit("close", 0);
  });
  return child;
};

const startServer = async (env, text = "답변") => {
  initPrivate(env);
  const config = loadConfig(env);
  const server = createRuntimeServer(config, {
    spawnImpl: replySpawn(text),
    env: { PATH: "/usr/bin" },
    log: { info() {}, warn() {} },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  config.port = server.address().port;
  const base = `http://127.0.0.1:${config.port}`;
  const request = (pathname, { method = "GET", body, token = config.token } = {}) =>
    fetch(`${base}${pathname}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  return { server, config, request };
};

const SESSION = "agent:researcher-1:main";
const history = async (request, sessionId = SESSION, token) =>
  request(`/v1/sessions/history?session_id=${encodeURIComponent(sessionId)}`, { token });
const chat = (request, content, sessionId = SESSION) =>
  request("/v1/chat/completions", {
    method: "POST",
    body: { session_id: sessionId, messages: [{ role: "user", content }] },
  });

test("a chat turn is saved privately and survives a runtime restart", async () => {
  const env = { LABS_PRIVATE_DIR: tmpPrivateRoot() };
  const first = await startServer(env, "4");
  try {
    const res = await chat(first.request, "2 더하기 2는?");
    assert.equal(res.status, 200);
    assert.equal((await res.json()).history_saved, true);
  } finally {
    first.server.close();
  }
  const dir = path.join(first.config.paths.researchersDir, "researcher-1", "sessions");
  const files = fs.readdirSync(dir);
  assert.equal(files.length, 1);
  assert.match(files[0], /^[0-9a-f]{40}\.json$/);
  assert.equal(fs.statSync(path.join(dir, files[0])).mode & 0o777, 0o600);

  const second = await startServer(env);
  try {
    const body = await (await history(second.request)).json();
    assert.deepEqual(
      body.messages.map((m) => [m.role, m.content]),
      [["user", "2 더하기 2는?"], ["assistant", "4"]],
    );
    assert.equal(body.truncated, false);
  } finally {
    second.server.close();
  }
});

test("history needs the token and rejects foreign or unsafe session ids", async () => {
  const { server, request } = await startServer({ LABS_PRIVATE_DIR: tmpPrivateRoot() });
  try {
    assert.equal((await history(request, SESSION, "")).status, 401);
    for (const bad of ["agent:other:main", "../../etc/passwd", "agent:researcher-1:../x/../y", "", "x".repeat(300)]) {
      assert.equal((await history(request, bad)).status, 400, bad);
    }
    assert.deepEqual((await (await history(request, "agent:researcher-1:empty")).json()).messages, []);
    assert.equal(isValidSessionId("agent:researcher-1:main", "researcher-1"), true);
    assert.equal(isValidSessionId("agent:researcher-10:main", "researcher-1"), false);
  } finally {
    server.close();
  }
});

test("new session archives the transcript instead of deleting it", async () => {
  const { server, request, config } = await startServer({ LABS_PRIVATE_DIR: tmpPrivateRoot() });
  try {
    await chat(request, "첫 질문");
    const reset = await request("/v1/sessions/reset", { method: "POST", body: { session_id: SESSION } });
    assert.deepEqual(await reset.json(), { ok: true, archived: true });
    assert.deepEqual((await (await history(request)).json()).messages, []);
    const dir = path.join(config.paths.researchersDir, "researcher-1", "sessions");
    const archived = fs.readdirSync(dir).filter((name) => name.includes(".reset-"));
    assert.equal(archived.length, 1);
    assert.equal((await request("/v1/sessions/reset", { method: "POST", body: { session_id: "../x" } })).status, 400);
  } finally {
    server.close();
  }
});

test("a failed save is reported while the reply is still returned", async () => {
  const env = { LABS_PRIVATE_DIR: tmpPrivateRoot() };
  initPrivate(env);
  const config = loadConfig(env);
  // A file where the sessions directory should be makes every save fail.
  fs.writeFileSync(path.join(config.paths.researchersDir, "researcher-1", "sessions"), "not a dir");
  const { server, request } = await startServer(env, "답");
  try {
    const res = await chat(request, "질문");
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.history_saved, false);
    assert.equal(body.choices[0].message.content, "답");
  } finally {
    server.close();
  }
});

test("transcripts keep the newest messages within the limits and say so", () => {
  const env = { LABS_PRIVATE_DIR: tmpPrivateRoot() };
  initPrivate(env);
  const config = loadConfig(env);
  const store = createTranscriptStore({ paths: config.paths, researcherId: "researcher-1" });
  const entries = Array.from({ length: TRANSCRIPT_LIMITS.maxMessages + 5 }, (_, i) => ({
    role: i % 2 ? "assistant" : "user",
    content: `m${i}`,
  }));
  store.append(SESSION, entries);
  const { messages, truncated } = store.read(SESSION);
  assert.equal(messages.length, TRANSCRIPT_LIMITS.maxMessages);
  assert.equal(messages[0].content, "m5");
  assert.equal(truncated, true);
});

test("the sessions directory may not resolve into the repository", () => {
  const env = { LABS_PRIVATE_DIR: tmpPrivateRoot() };
  initPrivate(env);
  const config = loadConfig(env);
  const repoRoot = path.resolve(__dirname, "..", "..");
  fs.symlinkSync(path.join(repoRoot, "runtime"), path.join(config.paths.researchersDir, "researcher-1", "sessions"));
  const store = createTranscriptStore({ paths: config.paths, researcherId: "researcher-1", repoRoot });
  assert.throws(() => store.append(SESSION, [{ role: "user", content: "x" }]), /outside the repository/);
  assert.equal(fs.readdirSync(path.join(repoRoot, "runtime")).some((name) => name.endsWith(".json") && /^[0-9a-f]{40}/.test(name)), false);
});

test("repeated resets keep every archived transcript", () => {
  const env = { LABS_PRIVATE_DIR: tmpPrivateRoot() };
  initPrivate(env);
  const config = loadConfig(env);
  const store = createTranscriptStore({ paths: config.paths, researcherId: "researcher-1", now: () => 123 });
  store.append(SESSION, [{ role: "user", content: "first" }]);
  store.reset(SESSION);
  store.append(SESSION, [{ role: "user", content: "second" }]);
  store.reset(SESSION);
  const archives = fs.readdirSync(store.dir).filter((name) => name.includes(".reset-"));
  assert.equal(archives.length, 2);
  const contents = archives.map((name) => JSON.parse(fs.readFileSync(path.join(store.dir, name), "utf8")).messages[0].content).sort();
  assert.deepEqual(contents, ["first", "second"]);
});

test("a single oversized message is cut so the file stays within the byte limit", () => {
  const env = { LABS_PRIVATE_DIR: tmpPrivateRoot() };
  initPrivate(env);
  const config = loadConfig(env);
  const store = createTranscriptStore({ paths: config.paths, researcherId: "researcher-1" });
  store.append(SESSION, [{ role: "assistant", content: "가".repeat(TRANSCRIPT_LIMITS.maxBytes + 1) }]);
  const file = path.join(store.dir, fs.readdirSync(store.dir)[0]);
  assert.ok(fs.statSync(file).size <= TRANSCRIPT_LIMITS.maxBytes);
  const { messages, truncated } = store.read(SESSION);
  assert.equal(truncated, true);
  assert.equal(messages.length, 1);
  assert.match(messages[0].content, /저장 한도를 넘어/);
});
