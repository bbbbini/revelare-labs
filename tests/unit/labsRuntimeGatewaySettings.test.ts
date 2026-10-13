import { describe, expect, it } from "vitest";

import { resolveGatewayAutoRetryDelayMs } from "@/lib/gateway/GatewayClient";
import {
  LABS_RUNTIME_URL,
  isLabsRuntimeUrl,
  mergeStudioSettings,
  normalizeStudioSettings,
  resolveDefaultStudioGatewayProfile,
  resolveStudioGatewayProfiles,
} from "@/lib/studio/settings";

const savedGateway = (gateway: Record<string, unknown>) =>
  normalizeStudioSettings({ version: 1, gateway }).gateway;

describe("local Labs Runtime gateway settings", () => {
  it("recognizes only the local Labs Runtime address", () => {
    expect(isLabsRuntimeUrl("http://localhost:7770")).toBe(true);
    expect(isLabsRuntimeUrl("http://127.0.0.1:7770/")).toBe(true);
    for (const url of [
      "http://localhost:7771",
      "https://localhost:7770",
      "http://10.0.0.5:7770",
      "http://localhost:7770/api",
      "ws://localhost:7770",
      "",
    ]) {
      expect(isLabsRuntimeUrl(url)).toBe(false);
    }
  });

  it("reads a saved custom localhost:7770 as 127.0.0.1", () => {
    const gateway = savedGateway({
      url: "http://localhost:7770",
      adapterType: "custom",
      profiles: { custom: { url: "http://localhost:7770" } },
      lastKnownGood: { url: "http://localhost:7770", adapterType: "custom" },
    });
    expect(gateway?.url).toBe(LABS_RUNTIME_URL);
    expect(gateway?.profiles?.custom?.url).toBe(LABS_RUNTIME_URL);
    expect(gateway?.lastKnownGood?.url).toBe(LABS_RUNTIME_URL);
  });

  it("keeps external, other-port and other-backend URLs as before", () => {
    const gateway = savedGateway({
      url: "http://10.0.0.5:9000",
      adapterType: "custom",
      profiles: {
        custom: { url: "http://10.0.0.5:9000" },
        local: { url: "http://localhost:7770" },
        hermes: { url: "ws://localhost:18789" },
      },
    });
    expect(gateway?.url).toBe("http://10.0.0.5:9000");
    expect(gateway?.profiles?.custom?.url).toBe("http://10.0.0.5:9000");
    expect(gateway?.profiles?.local?.url).toBe("http://localhost:7770");
    expect(gateway?.profiles?.hermes?.url).toBe("ws://localhost:18789");

    const otherPort = savedGateway({ url: "http://127.0.0.1:7771", adapterType: "custom" });
    expect(otherPort?.url).toBe("http://localhost:7771");
  });

  it("stores 127.0.0.1 even when an open tab writes localhost back", () => {
    const current = normalizeStudioSettings({
      version: 1,
      gateway: { url: LABS_RUNTIME_URL, adapterType: "custom" },
    });
    const merged = mergeStudioSettings(current, {
      gateway: {
        url: "http://localhost:7770",
        adapterType: "custom",
        profiles: { custom: { url: "http://localhost:7770", token: "" } },
        lastKnownGood: { url: "http://localhost:7770", adapterType: "custom" },
      },
    });
    expect(merged.gateway?.url).toBe(LABS_RUNTIME_URL);
    expect(merged.gateway?.profiles?.custom?.url).toBe(LABS_RUNTIME_URL);
    expect(merged.gateway?.lastKnownGood?.url).toBe(LABS_RUNTIME_URL);
  });

  it("defaults a fresh install to the Labs Runtime on the custom backend", () => {
    const fresh = resolveStudioGatewayProfiles({ gateway: null });
    expect(fresh.selectedAdapterType).toBe("custom");
    expect(fresh.activeProfile?.url ?? resolveDefaultStudioGatewayProfile("custom").url).toBe(
      LABS_RUNTIME_URL,
    );
    expect(resolveDefaultStudioGatewayProfile("custom").url).toBe(LABS_RUNTIME_URL);
  });

  it("keeps a saved backend choice over the fresh default", () => {
    const saved = resolveStudioGatewayProfiles({
      gateway: savedGateway({ url: "ws://localhost:18789", adapterType: "hermes" }),
    });
    expect(saved.selectedAdapterType).toBe("hermes");
    expect(saved.activeProfile?.url).toBe("ws://localhost:18789");
  });
});

describe("Labs Runtime retry before the first connection", () => {
  const params = {
    status: "disconnected" as const,
    didAutoConnect: true,
    hasConnectedOnce: false,
    wasManualDisconnect: false,
    gatewayUrl: LABS_RUNTIME_URL,
    errorMessage: "Labs Runtime offline",
    connectErrorCode: "studio.custom_runtime_probe_failed",
    lastDisconnectCode: null,
    attempt: 0,
  };

  it("does not retry before a first connection by default", () => {
    expect(resolveGatewayAutoRetryDelayMs(params)).toBeNull();
  });

  it("retries a bounded number of times when allowed", () => {
    expect(resolveGatewayAutoRetryDelayMs({ ...params, initialRetryAttempts: 5 })).toBe(2000);
    expect(
      resolveGatewayAutoRetryDelayMs({ ...params, initialRetryAttempts: 5, attempt: 4 }),
    ).not.toBeNull();
    expect(
      resolveGatewayAutoRetryDelayMs({ ...params, initialRetryAttempts: 5, attempt: 5 }),
    ).toBeNull();
  });

  it("stops after a manual disconnect", () => {
    expect(
      resolveGatewayAutoRetryDelayMs({ ...params, initialRetryAttempts: 5, wasManualDisconnect: true }),
    ).toBeNull();
  });
});
