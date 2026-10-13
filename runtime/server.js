"use strict";

// REVELARE Labs Runtime: a private HTTP runtime for Hermes3D's custom runtime
// adapter. Binds to 127.0.0.1 only and requires a bearer token on every route.
//   GET  /health, GET /state, GET /registry, POST /v1/chat/completions

const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");

const { loadConfig } = require("./config");
const { buildPrompt } = require("./prompt");
const { getProvider } = require("./providers");
const { createJobQueue } = require("./queue");

const RUNTIME_NAME = "REVELARE Labs Runtime";
const RUNTIME_VERSION = "0.1.0";

const sendJson = (res, status, body) => {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
  });
  res.end(payload);
};

const sendError = (res, status, code, message) =>
  sendJson(res, status, { error: { code, message } });

const tokensMatch = (expected, provided) => {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(String(provided ?? ""), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const readBearer = (req) => {
  const header = String(req.headers.authorization ?? "");
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
};

// Rejects requests whose Host is not this loopback listener (DNS rebinding).
const isAllowedHost = (req, port) => {
  const host = String(req.headers.host ?? "").toLowerCase();
  return host === `127.0.0.1:${port}` || host === `localhost:${port}`;
};

const readJsonBody = (req, maxBytes) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(Object.assign(new Error("Request body too large."), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        reject(Object.assign(new Error("Invalid JSON body."), { status: 400 }));
      }
    });
    req.on("error", reject);
  });

const CLI_ERROR_STATUS = {
  timeout: 504,
  output_too_large: 502,
  exit_nonzero: 502,
  spawn_failed: 502,
  aborted: 499,
};

const createRuntimeServer = (config, { log = console, spawnImpl, env = process.env } = {}) => {
  const researcher = config.researchers[0];
  const provider = getProvider(researcher.provider);
  const queue = createJobQueue(config.limits);
  let activeJobs = 0;

  const researcherStatus = () => (activeJobs > 0 ? "working" : "idle");

  const handleState = (res) => {
    const stats = queue.stats();
    sendJson(res, 200, {
      profileName: "revelare-labs",
      runtime: {
        name: RUNTIME_NAME,
        version: RUNTIME_VERSION,
        vendor: "REVELARE",
        status: researcherStatus(),
        active_model: provider.modelId,
      },
      identity: {
        name: researcher.name,
        role: researcher.id,
        lane: researcher.id,
        model_id: provider.modelId,
      },
      researchers: [
        { id: researcher.id, name: researcher.name, provider: provider.id, status: researcherStatus() },
      ],
      queue: { running: stats.running, waiting: stats.waiting, max_waiting: stats.maxQueueLength },
    });
  };

  const handleRegistry = (res) => {
    sendJson(res, 200, {
      models: { [provider.modelId]: { provider: provider.id, label: provider.label } },
    });
  };

  const handleChat = async (req, res) => {
    let body;
    try {
      body = await readJsonBody(req, config.limits.maxRequestBytes);
    } catch (error) {
      sendError(res, error.status ?? 400, "bad_request", error.message);
      return;
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      sendError(res, 400, "bad_request", "Request body must be a JSON object.");
      return;
    }
    if (body.stream === true) {
      sendError(res, 400, "unsupported", "Streaming is not supported.");
      return;
    }
    let prompt;
    try {
      prompt = buildPrompt({
        messages: body.messages,
        researcher,
        maxChars: config.limits.maxPromptChars,
      });
    } catch (error) {
      sendError(res, 400, "bad_request", error.message);
      return;
    }

    const controller = new AbortController();
    res.on("close", () => {
      if (!res.writableEnded) controller.abort();
    });
    const startedAt = Date.now();
    try {
      const text = await queue.enqueue(async () => {
        if (controller.signal.aborted) throw Object.assign(new Error("Request was cancelled."), { code: "aborted" });
        activeJobs += 1;
        try {
          return await provider.complete({
            prompt,
            cwd: researcher.workdir,
            limits: config.limits,
            signal: controller.signal,
            spawnImpl,
            env,
          });
        } finally {
          activeJobs -= 1;
        }
      });
      if (!text) {
        sendError(res, 502, "empty_response", "The provider returned an empty response.");
        return;
      }
      log.info(`[labs-runtime] chat ok provider=${provider.id} ms=${Date.now() - startedAt} chars=${text.length}`);
      sendJson(res, 200, {
        id: `chatcmpl-${crypto.randomUUID()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: provider.modelId,
        choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
      });
    } catch (error) {
      if (error.code === "queue_full") {
        sendError(res, 429, "queue_full", error.message);
        return;
      }
      const status = CLI_ERROR_STATUS[error.code] ?? 500;
      // Only the error code and message are logged; prompts, outputs and CLI
      // stderr can contain private material and are never logged or returned.
      log.warn(`[labs-runtime] chat failed provider=${provider.id} code=${error.code ?? "unknown"} ms=${Date.now() - startedAt}`);
      if (!res.headersSent && !res.destroyed) {
        sendError(res, status, error.code ?? "internal", error.code ? error.message : "Runtime error.");
      }
    }
  };

  const server = http.createServer((req, res) => {
    if (!isAllowedHost(req, config.port)) {
      sendError(res, 421, "bad_host", "Unexpected Host header.");
      return;
    }
    if (!tokensMatch(config.token, readBearer(req))) {
      sendError(res, 401, "unauthorized", "Missing or invalid bearer token.");
      return;
    }
    const pathname = new URL(req.url, "http://127.0.0.1").pathname;
    if (req.method === "GET" && pathname === "/health") {
      sendJson(res, 200, { ok: true, status: "ok" });
    } else if (req.method === "GET" && pathname === "/state") {
      handleState(res);
    } else if (req.method === "GET" && pathname === "/registry") {
      handleRegistry(res);
    } else if (req.method === "POST" && pathname === "/v1/chat/completions") {
      handleChat(req, res).catch((error) => {
        log.warn(`[labs-runtime] chat handler error code=${error?.code ?? "unknown"}`);
        if (!res.headersSent && !res.destroyed) sendError(res, 500, "internal", "Runtime error.");
      });
    } else {
      sendError(res, 404, "not_found", "Not found.");
    }
  });
  server.requestTimeout = config.limits.cliTimeoutMs * (config.limits.maxQueueLength + 2);
  return server;
};

const main = () => {
  const config = loadConfig();
  const researcher = config.researchers[0];
  if (!fs.existsSync(researcher.workdir)) {
    throw new Error("Researcher working directory is missing. Run `npm run labs-runtime:init` first.");
  }
  const server = createRuntimeServer(config);
  server.listen(config.port, config.host, () => {
    console.info(
      `[labs-runtime] listening on http://${config.host}:${config.port} researcher=${researcher.id} provider=${researcher.provider}`,
    );
  });
  const shutdown = () => server.close(() => process.exit(0));
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[labs-runtime] ${error.message}`);
    process.exit(1);
  }
}

module.exports = { createRuntimeServer };
