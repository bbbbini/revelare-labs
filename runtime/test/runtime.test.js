"use strict";

const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { PassThrough } = require("node:stream");
const test = require("node:test");

const { assertOutsideRepo, loadConfig } = require("../config");
const { initPrivate } = require("../init-private");
const { buildPrompt } = require("../prompt");
const { buildCliEnv, runCli } = require("../providers");
const { createJobQueue } = require("../queue");
const { createRuntimeServer } = require("../server");

const tmpPrivateRoot = () => fs.mkdtempSync(path.join(os.tmpdir(), "labs-runtime-test-"));

// Fake child process: records the call and replies via `behavior`.
const fakeSpawn = (behavior, calls = []) => (command, args, options) => {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.stdin = new PassThrough();
  child.exitCode = null;
  child.kill = () => {
    child.killed = true;
    if (child.exitCode === null) {
      child.exitCode = 143;
      setImmediate(() => child.emit("close", 143));
    }
  };
  const call = { command, args, options, input: "" };
  calls.push(call);
  child.stdin.on("data", (chunk) => {
    call.input += chunk.toString();
  });
  child.stdin.on("finish", () => behavior(child, call));
  return child;
};

const reply = (text, delayMs = 0) => (child, call) => {
  setTimeout(() => {
    if (child.killed) return;
    if (call.command === "codex") {
      const file = call.args[call.args.indexOf("--output-last-message") + 1];
      fs.writeFileSync(file, text);
      child.stdout.write("codex progress noise\n");
    } else {
      child.stdout.write(text);
    }
    child.exitCode = 0;
    child.emit("close", 0);
  }, delayMs);
};

const startServer = async (env, spawnImpl) => {
  initPrivate(env);
  const config = loadConfig(env);
  config.port = 0;
  const server = createRuntimeServer(config, {
    spawnImpl,
    env: { PATH: "/usr/bin", ANTHROPIC_API_KEY: "should-be-stripped" },
    log: { info() {}, warn() {} },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  config.port = port;
  const base = `http://127.0.0.1:${port}`;
  const request = (pathname, { method = "GET", body, token = config.token, headers = {} } = {}) =>
    fetch(`${base}${pathname}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  return { server, config, request };
};

test("init creates private layout with a 0600 token and default claude config", () => {
  const root = tmpPrivateRoot();
  const env = { LABS_PRIVATE_DIR: root };
  const first = initPrivate(env);
  assert.equal(first.createdToken, true);
  const tokenStat = fs.statSync(first.paths.tokenFile);
  assert.equal(tokenStat.mode & 0o777, 0o600);
  assert.equal(fs.statSync(root).mode & 0o777, 0o700);
  assert.ok(fs.existsSync(path.join(root, "researchers", "researcher-1", "workdir")));
  const token = fs.readFileSync(first.paths.tokenFile, "utf8");
  const second = initPrivate(env);
  assert.equal(second.createdToken, false);
  assert.equal(fs.readFileSync(first.paths.tokenFile, "utf8"), token);
  assert.equal(loadConfig(env).researchers[0].provider, "claude");
});

test("init refuses a private directory inside the repository", () => {
  assert.throws(
    () => initPrivate({ LABS_PRIVATE_DIR: path.join(__dirname, "private-inside-repo") }),
    /outside the repository/,
  );
});

test("private directory check compares path segments, not name prefixes", () => {
  const repoRoot = path.resolve(__dirname, "..", "..");
  assert.throws(() => assertOutsideRepo(path.join(repoRoot, "..private-probe"), repoRoot), /outside the repository/);
  assert.throws(() => assertOutsideRepo(repoRoot, repoRoot), /outside the repository/);
  assert.doesNotThrow(() => assertOutsideRepo(path.join(path.dirname(repoRoot), "private-sibling"), repoRoot));
  assert.throws(
    () => loadConfig({ LABS_PRIVATE_DIR: path.join(repoRoot, "..private-probe") }),
    /outside the repository/,
  );
});

test("private directory check rejects a symlink that points into the repository", () => {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const linkParent = tmpPrivateRoot();
  const link = path.join(linkParent, "linked-private");
  fs.symlinkSync(path.join(repoRoot, "runtime"), link);
  assert.throws(() => assertOutsideRepo(link, repoRoot), /outside the repository/);
  assert.throws(() => assertOutsideRepo(path.join(link, "not-yet-created"), repoRoot), /outside the repository/);
  assert.throws(() => initPrivate({ LABS_PRIVATE_DIR: path.join(link, "new-root") }), /outside the repository/);
  assert.equal(fs.existsSync(path.join(repoRoot, "runtime", "new-root")), false);
});

test("init refuses a private subdirectory symlinked into the repo before writing anything", () => {
  const fixtureRepo = tmpPrivateRoot();
  fs.mkdirSync(path.join(fixtureRepo, "leak"));
  const privateRoot = path.join(tmpPrivateRoot(), "private");
  fs.mkdirSync(privateRoot);
  fs.symlinkSync(path.join(fixtureRepo, "leak"), path.join(privateRoot, "runtime"));
  const env = { LABS_PRIVATE_DIR: privateRoot };
  assert.throws(() => initPrivate(env, { repoRoot: fixtureRepo }), /outside the repository/);
  assert.deepEqual(fs.readdirSync(path.join(fixtureRepo, "leak")), []);
  assert.deepEqual(fs.readdirSync(privateRoot), ["runtime"]);
  assert.throws(() => loadConfig(env, { repoRoot: fixtureRepo }), /outside the repository/);
});

test("init refuses a token file symlinked into the repo", () => {
  const fixtureRepo = tmpPrivateRoot();
  const privateRoot = path.join(tmpPrivateRoot(), "private");
  fs.mkdirSync(path.join(privateRoot, "runtime"), { recursive: true });
  fs.symlinkSync(path.join(fixtureRepo, "token"), path.join(privateRoot, "runtime", "token"));
  fs.writeFileSync(path.join(fixtureRepo, "token"), "x".repeat(64));
  assert.throws(() => initPrivate({ LABS_PRIVATE_DIR: privateRoot }, { repoRoot: fixtureRepo }), /outside the repository/);
  assert.throws(() => loadConfig({ LABS_PRIVATE_DIR: privateRoot }, { repoRoot: fixtureRepo }), /outside the repository/);
});

test("provider is selectable by config file and env, and validated", () => {
  const root = tmpPrivateRoot();
  const env = { LABS_PRIVATE_DIR: root };
  const { paths } = initPrivate(env);
  fs.writeFileSync(paths.configFile, JSON.stringify({ researchers: { "researcher-1": { provider: "codex" } } }));
  assert.equal(loadConfig(env).researchers[0].provider, "codex");
  assert.equal(loadConfig({ ...env, LABS_PROVIDER: "claude" }).researchers[0].provider, "claude");
  assert.throws(() => loadConfig({ ...env, LABS_PROVIDER: "openai-api" }), /Unknown provider/);
});

test("server binds only routes behind the token and serves state/registry", async () => {
  const { server, request } = await startServer({ LABS_PRIVATE_DIR: tmpPrivateRoot() }, fakeSpawn(reply("hi")));
  try {
    assert.equal((await request("/health", { token: "" })).status, 401);
    assert.equal((await request("/health", { token: "x".repeat(64) })).status, 401);
    const health = await request("/health");
    assert.deepEqual(await health.json(), { ok: true, status: "ok" });
    const state = await (await request("/state")).json();
    assert.equal(state.identity.lane, "researcher-1");
    assert.equal(state.identity.name, "Researcher 1");
    assert.equal(state.runtime.status, "idle");
    const registry = await (await request("/registry")).json();
    assert.deepEqual(Object.keys(registry.models), ["claude-cli"]);
    assert.equal((await request("/nope")).status, 404);
  } finally {
    server.close();
  }
});

test("server rejects unexpected Host headers", async () => {
  const { server, config } = await startServer({ LABS_PRIVATE_DIR: tmpPrivateRoot() }, fakeSpawn(reply("hi")));
  try {
    const http = require("node:http");
    const status = await new Promise((resolve, reject) => {
      const req = http.request(
        { host: "127.0.0.1", port: config.port, path: "/health", headers: { Host: "evil.example:80", Authorization: `Bearer ${config.token}` } },
        (res) => resolve(res.statusCode),
      );
      req.on("error", reject);
      req.end();
    });
    assert.equal(status, 421);
  } finally {
    server.close();
  }
});

test("chat runs claude -p with the prompt on stdin, no API keys, private cwd", async () => {
  const calls = [];
  const { server, config, request } = await startServer(
    { LABS_PRIVATE_DIR: tmpPrivateRoot() },
    fakeSpawn(reply("  안녕하세요  "), calls),
  );
  try {
    const res = await request("/v1/chat/completions", {
      method: "POST",
      body: { messages: [{ role: "user", content: "안녕?" }] },
    });
    assert.equal(res.status, 200);
    const payload = await res.json();
    assert.equal(payload.choices[0].message.content, "안녕하세요");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].command, "claude");
    assert.ok(calls[0].args.includes("-p"));
    assert.ok(calls[0].input.includes("안녕?"));
    assert.equal(calls[0].options.cwd, config.researchers[0].workdir);
    assert.equal(calls[0].options.env.ANTHROPIC_API_KEY, undefined);
  } finally {
    server.close();
  }
});

test("chat via codex reads only the final message file", async () => {
  const root = tmpPrivateRoot();
  const calls = [];
  const { server, config, request } = await startServer(
    { LABS_PRIVATE_DIR: root, LABS_PROVIDER: "codex" },
    fakeSpawn(reply("codex answer"), calls),
  );
  try {
    const res = await request("/v1/chat/completions", {
      method: "POST",
      body: { messages: [{ role: "user", content: "hello" }] },
    });
    const payload = await res.json();
    assert.equal(payload.choices[0].message.content, "codex answer");
    assert.equal(payload.model, "codex-cli");
    assert.equal(calls[0].command, "codex");
    assert.deepEqual(calls[0].args.slice(0, 4), ["exec", "--skip-git-repo-check", "--sandbox", "read-only"]);
    assert.deepEqual(fs.readdirSync(config.researchers[0].workdir), []);
  } finally {
    server.close();
  }
});

test("state reports working while a chat is running, then idle", async () => {
  const { server, request } = await startServer(
    { LABS_PRIVATE_DIR: tmpPrivateRoot() },
    fakeSpawn(reply("done", 300)),
  );
  try {
    const pending = request("/v1/chat/completions", {
      method: "POST",
      body: { messages: [{ role: "user", content: "work" }] },
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const during = await (await request("/state")).json();
    assert.equal(during.runtime.status, "working");
    assert.equal(during.researchers[0].status, "working");
    assert.equal((await pending).status, 200);
    const after = await (await request("/state")).json();
    assert.equal(after.runtime.status, "idle");
  } finally {
    server.close();
  }
});

test("chat rejects bad input and streaming", async () => {
  const { server, config, request } = await startServer({ LABS_PRIVATE_DIR: tmpPrivateRoot() }, fakeSpawn(reply("x")));
  try {
    const noUser = await request("/v1/chat/completions", { method: "POST", body: { messages: [] } });
    assert.equal(noUser.status, 400);
    const stream = await request("/v1/chat/completions", {
      method: "POST",
      body: { stream: true, messages: [{ role: "user", content: "x" }] },
    });
    assert.equal(stream.status, 400);
    for (const raw of ["null", "[]", "5", '"text"']) {
      const res = await fetch(`http://127.0.0.1:${server.address().port}/v1/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
        body: raw,
      });
      assert.equal(res.status, 400, `body ${raw}`);
    }
    const health = await request("/health");
    assert.equal(health.status, 200);
  } finally {
    server.close();
  }
});

test("queue does not start the next CLI run until the timed-out one has exited", async () => {
  const root = tmpPrivateRoot();
  const env = { LABS_PRIVATE_DIR: root };
  const { paths } = initPrivate(env);
  fs.writeFileSync(
    paths.configFile,
    JSON.stringify({ researchers: { "researcher-1": { provider: "claude" } }, limits: { cliTimeoutMs: 100 } }),
  );
  let alive = 0;
  let maxAlive = 0;
  const events = [];
  // First child ignores SIGTERM for 300ms before exiting; the second replies.
  let spawned = 0;
  const spawnImpl = fakeSpawn((child, call) => {
    spawned += 1;
    alive += 1;
    maxAlive = Math.max(maxAlive, alive);
    const index = spawned;
    events.push(`start${index}`);
    child.kill = () => {
      setTimeout(() => {
        alive -= 1;
        events.push(`exit${index}`);
        child.exitCode = 143;
        child.emit("close", 143);
      }, 300);
    };
    if (index === 2) {
      reply("second")(child, call);
      child.on("close", () => {
        alive -= 1;
        events.push(`exit${index}`);
      });
    }
  });
  const { server, request } = await startServer(env, spawnImpl);
  try {
    const body = { messages: [{ role: "user", content: "x" }] };
    const [first, second] = await Promise.all([
      request("/v1/chat/completions", { method: "POST", body }),
      request("/v1/chat/completions", { method: "POST", body }),
    ]);
    assert.equal(first.status, 504);
    assert.equal(second.status, 200);
    assert.equal(maxAlive, 1);
    assert.deepEqual(events.slice(0, 3), ["start1", "exit1", "start2"]);
  } finally {
    server.close();
  }
});

test("runCli enforces timeout and output limit", async () => {
  const hang = fakeSpawn(() => {});
  await assert.rejects(
    runCli({ command: "claude", args: [], input: "x", cwd: os.tmpdir(), env: {}, timeoutMs: 50, maxOutputBytes: 10, spawnImpl: hang }),
    (error) => error.code === "timeout",
  );
  const flood = fakeSpawn((child) => child.stdout.write("y".repeat(100)));
  await assert.rejects(
    runCli({ command: "claude", args: [], input: "x", cwd: os.tmpdir(), env: {}, timeoutMs: 1000, maxOutputBytes: 10, spawnImpl: flood }),
    (error) => error.code === "output_too_large",
  );
});

// A child that keeps running for `exitDelayMs` after it is signalled.
const slowExitSpawn = (onStart, exitDelayMs, state) =>
  fakeSpawn((child) => {
    state.alive += 1;
    child.kill = () => {
      if (child.signalled) return;
      child.signalled = true;
      setTimeout(() => {
        state.alive -= 1;
        child.exitCode = 143;
        child.emit("close", 143);
      }, exitDelayMs);
    };
    onStart(child);
  });

for (const scenario of ["timeout", "aborted", "output_too_large"]) {
  test(`runCli settles ${scenario} only after the child has exited`, async () => {
    const state = { alive: 0 };
    const controller = new AbortController();
    const spawnImpl = slowExitSpawn(
      (child) => {
        if (scenario === "output_too_large") child.stdout.write("z".repeat(50));
        if (scenario === "aborted") setTimeout(() => controller.abort(), 10);
      },
      150,
      state,
    );
    const started = Date.now();
    await assert.rejects(
      runCli({
        command: "claude",
        args: [],
        input: "x",
        cwd: os.tmpdir(),
        env: {},
        timeoutMs: scenario === "timeout" ? 20 : 5_000,
        maxOutputBytes: 10,
        signal: controller.signal,
        spawnImpl,
      }),
      (error) => error.code === scenario,
    );
    assert.equal(state.alive, 0, "child must be gone when the promise settles");
    assert.ok(Date.now() - started >= 140);
  });
}

test("runCli rejects an already-cancelled request without spawning", async () => {
  const controller = new AbortController();
  controller.abort();
  const calls = [];
  const spawnImpl = fakeSpawn(reply("never"), calls);
  await assert.rejects(
    runCli({ command: "claude", args: [], input: "x", cwd: os.tmpdir(), env: {}, timeoutMs: 1_000, maxOutputBytes: 10, signal: controller.signal, spawnImpl }),
    (error) => error.code === "aborted",
  );
  assert.equal(calls.length, 0);
});

test("a cancelled queued request frees the queue for the next one", async () => {
  const calls = [];
  const { server, config, request } = await startServer(
    { LABS_PRIVATE_DIR: tmpPrivateRoot() },
    fakeSpawn(reply("ok", 200), calls),
  );
  try {
    const body = JSON.stringify({ messages: [{ role: "user", content: "x" }] });
    const headers = { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" };
    const url = `http://127.0.0.1:${config.port}/v1/chat/completions`;
    const first = fetch(url, { method: "POST", headers, body });
    await new Promise((resolve) => setTimeout(resolve, 50));
    const cancelled = new AbortController();
    const second = fetch(url, { method: "POST", headers, body, signal: cancelled.signal }).catch(() => "cancelled");
    await new Promise((resolve) => setTimeout(resolve, 50));
    cancelled.abort();
    assert.equal((await first).status, 200);
    assert.equal(await second, "cancelled");
    const third = await request("/v1/chat/completions", { method: "POST", body: { messages: [{ role: "user", content: "y" }] } });
    assert.equal(third.status, 200);
    assert.equal(calls.length, 2, "the cancelled request never started a CLI");
    assert.equal((await (await request("/state")).json()).queue.running, 0);
  } finally {
    server.close();
  }
});

test("state stays working until a timed-out child has exited", async () => {
  const root = tmpPrivateRoot();
  const env = { LABS_PRIVATE_DIR: root };
  const { paths } = initPrivate(env);
  fs.writeFileSync(paths.configFile, JSON.stringify({ limits: { cliTimeoutMs: 30 } }));
  const state = { alive: 0 };
  const { server, request } = await startServer(env, slowExitSpawn(() => {}, 400, state));
  try {
    const pending = request("/v1/chat/completions", { method: "POST", body: { messages: [{ role: "user", content: "x" }] } });
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.equal(state.alive, 1);
    assert.equal((await (await request("/state")).json()).runtime.status, "working");
    assert.equal((await pending).status, 504);
    assert.equal(state.alive, 0);
    assert.equal((await (await request("/state")).json()).runtime.status, "idle");
  } finally {
    server.close();
  }
});

test("queue runs one job at a time and rejects when full", async () => {
  const queue = createJobQueue({ maxConcurrency: 1, maxQueueLength: 1 });
  let concurrent = 0;
  let maxSeen = 0;
  const job = () =>
    queue.enqueue(async () => {
      concurrent += 1;
      maxSeen = Math.max(maxSeen, concurrent);
      await new Promise((resolve) => setTimeout(resolve, 30));
      concurrent -= 1;
    });
  const first = job();
  const second = job();
  await assert.rejects(job(), (error) => error.code === "queue_full");
  await Promise.all([first, second]);
  assert.equal(maxSeen, 1);
});

test("buildCliEnv strips API keys and keeps the rest", () => {
  const env = buildCliEnv({ PATH: "/bin", OPENAI_API_KEY: "a", ANTHROPIC_API_KEY: "b", HOME: "/h" });
  assert.deepEqual(env, { PATH: "/bin", HOME: "/h" });
});

test("buildPrompt keeps the latest user message within the budget", () => {
  const researcher = { id: "researcher-1", name: "Researcher 1" };
  const messages = [
    { role: "user", content: "old ".repeat(500) },
    { role: "assistant", content: "reply" },
    { role: "user", content: "latest question" },
  ];
  const prompt = buildPrompt({ messages, researcher, maxChars: 600 });
  assert.ok(prompt.includes("latest question"));
  assert.ok(prompt.length <= 600);
  assert.ok(!prompt.includes("old old old old old old"));
  assert.throws(() => buildPrompt({ messages: [{ role: "assistant", content: "x" }], researcher, maxChars: 600 }));
});
