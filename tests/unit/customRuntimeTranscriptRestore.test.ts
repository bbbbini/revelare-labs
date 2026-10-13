import { afterEach, describe, expect, it, vi } from "vitest";

import type { GatewayClient } from "@/lib/gateway/GatewayClient";
import { CustomRuntimeProvider } from "@/lib/runtime/custom/provider";

const SESSION = "agent:researcher-1:main";

type ProxyCall = { pathname: string; method: string; body?: unknown };

const mockRuntime = (handlers: Record<string, (call: ProxyCall) => Response>) => {
  const calls: ProxyCall[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      const call = JSON.parse(String(init?.body ?? "{}")) as ProxyCall;
      calls.push(call);
      const key = call.pathname.split("?")[0];
      const handler = handlers[key];
      return handler ? handler(call) : new Response("not found", { status: 404 });
    })
  );
  return calls;
};

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

const createProvider = () =>
  new CustomRuntimeProvider({} as GatewayClient, "http://127.0.0.1:7770");

describe("custom runtime transcript restore", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("restores the saved conversation after a reload", async () => {
    const calls = mockRuntime({
      "/v1/sessions/history": () =>
        json({
          messages: [
            { role: "user", content: "2 더하기 2는?", timestamp: 1 },
            { role: "assistant", content: "4", timestamp: 2 },
          ],
        }),
    });
    const provider = createProvider();
    const history = await provider.call<{ messages: { role: string; content: string }[] }>(
      "chat.history",
      { sessionKey: SESSION }
    );
    expect(history.messages.map((m) => [m.role, m.content])).toEqual([
      ["user", "2 더하기 2는?"],
      ["assistant", "4"],
    ]);
    expect(calls[0].pathname).toBe(
      `/v1/sessions/history?session_id=${encodeURIComponent(SESSION)}`
    );
    // Loaded once per session.
    await provider.call("chat.history", { sessionKey: SESSION });
    expect(calls.filter((c) => c.pathname.startsWith("/v1/sessions/history"))).toHaveLength(1);
  });

  it("leaves the session empty when the runtime has no transcript endpoint", async () => {
    mockRuntime({});
    const provider = createProvider();
    const history = await provider.call<{ messages: unknown[] }>("chat.history", {
      sessionKey: SESSION,
    });
    expect(history.messages).toEqual([]);
  });

  it("reports a failed reset and keeps the conversation", async () => {
    mockRuntime({
      "/v1/sessions/history": () =>
        json({ messages: [{ role: "user", content: "old", timestamp: 1 }] }),
      "/v1/sessions/reset": () => new Response("boom", { status: 500 }),
    });
    const provider = createProvider();
    await provider.call("chat.history", { sessionKey: SESSION });
    await expect(provider.call("sessions.reset", { key: SESSION })).rejects.toThrow(
      /새 대화를 시작하지 못했습니다/
    );
    const history = await provider.call<{ messages: { content: string }[] }>("chat.history", {
      sessionKey: SESSION,
    });
    expect(history.messages.map((m) => m.content)).toEqual(["old"]);
  });

  it("treats a runtime without the reset endpoint (404) as nothing to archive", async () => {
    mockRuntime({});
    const provider = createProvider();
    await expect(provider.call("sessions.reset", { key: SESSION })).resolves.toEqual({ ok: true });
  });

  it("stops a running reply before asking the runtime to archive", async () => {
    let chatSignal: AbortSignal | undefined;
    const order: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        const call = JSON.parse(String(init?.body ?? "{}")) as ProxyCall;
        const key = call.pathname.split("?")[0];
        if (key === "/state") return json({ identity: { name: "연구원 1" } });
        if (key === "/registry") return json({ models: {} });
        if (key === "/v1/chat/completions") {
          chatSignal = init?.signal ?? undefined;
          return new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              order.push("chat-aborted");
              reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
            });
          });
        }
        if (key === "/v1/sessions/reset") {
          order.push(chatSignal?.aborted ? "reset-after-abort" : "reset-before-abort");
          return json({ ok: true, archived: true });
        }
        return new Response("not found", { status: 404 });
      })
    );
    const provider = createProvider();
    const sending = provider.call("chat.send", {
      sessionKey: SESSION,
      message: "long task",
      idempotencyKey: "run-1",
    });
    await vi.waitFor(() => expect(chatSignal).toBeDefined());
    await provider.call("sessions.reset", { key: SESSION });
    await sending.catch(() => null);
    expect(order).toEqual(["chat-aborted", "reset-after-abort"]);
  });

  it("keeps a new session empty after reset and asks the runtime to archive", async () => {
    const calls = mockRuntime({
      "/v1/sessions/history": () => json({ messages: [{ role: "user", content: "old", timestamp: 1 }] }),
      "/v1/sessions/reset": () => json({ ok: true, archived: true }),
    });
    const provider = createProvider();
    await provider.call("chat.history", { sessionKey: SESSION });
    await provider.call("sessions.reset", { key: SESSION });
    const history = await provider.call<{ messages: unknown[] }>("chat.history", {
      sessionKey: SESSION,
    });
    expect(history.messages).toEqual([]);
    const reset = calls.find((c) => c.pathname === "/v1/sessions/reset");
    expect(reset?.method).toBe("POST");
    expect(reset?.body).toEqual({ session_id: SESSION });
  });
});
