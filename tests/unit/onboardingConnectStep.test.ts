import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ConnectStep, LABS_RUNTIME_URL } from "@/features/onboarding/components/ConnectStep";
import type { StudioGatewayAdapterType } from "@/lib/studio/settings";

const renderStep = (adapterType: StudioGatewayAdapterType, gatewayUrl: string) => {
  const onAdapterTypeChange = vi.fn();
  const onGatewayUrlChange = vi.fn();
  const view = render(
    createElement(ConnectStep, {
      gatewayUrl,
      token: "",
      onGatewayUrlChange,
      onTokenChange: vi.fn(),
      onConnect: vi.fn(),
      adapterType,
      onAdapterTypeChange,
      connected: false,
      connecting: false,
      error: null,
    }),
  );
  return { onAdapterTypeChange, onGatewayUrlChange, view };
};

describe("onboarding ConnectStep keeps saved gateway settings", () => {
  afterEach(() => {
    cleanup();
  });

  it.each([
    ["hermes", "ws://localhost:18789"],
    ["custom", "http://localhost:7770"],
    ["custom", "http://10.0.0.5:9000"],
  ] as const)("does not change a saved %s URL %s on mount or remount", (adapterType, url) => {
    const first = renderStep(adapterType, url);
    expect(first.onAdapterTypeChange).not.toHaveBeenCalled();
    expect(first.onGatewayUrlChange).not.toHaveBeenCalled();
    first.view.unmount();

    const second = renderStep(adapterType, url);
    expect(second.onAdapterTypeChange).not.toHaveBeenCalled();
    expect(second.onGatewayUrlChange).not.toHaveBeenCalled();
  });

  it("switching to the Labs Runtime only changes the backend, leaving its saved URL to the handler", () => {
    const { onAdapterTypeChange, onGatewayUrlChange } = renderStep("hermes", "ws://localhost:18789");
    fireEvent.click(screen.getByRole("button", { name: "Labs Runtime (권장)" }));
    expect(onAdapterTypeChange).toHaveBeenCalledWith("custom");
    expect(onGatewayUrlChange).not.toHaveBeenCalled();
  });

  it("fills the Labs Runtime address only when the user asks", () => {
    const { onGatewayUrlChange } = renderStep("custom", "http://localhost:7770");
    fireEvent.click(screen.getByRole("button", { name: /Labs Runtime 주소 넣기/ }));
    expect(onGatewayUrlChange).toHaveBeenCalledWith(LABS_RUNTIME_URL);
  });

  it("hides the address button once the Labs Runtime address is set", () => {
    renderStep("custom", LABS_RUNTIME_URL);
    expect(screen.queryByRole("button", { name: /Labs Runtime 주소 넣기/ })).toBeNull();
  });

  it("shows Hermes setup only for the Hermes backend", () => {
    renderStep("custom", LABS_RUNTIME_URL);
    expect(screen.queryByText(/hermes-adapter/)).toBeNull();
    cleanup();
    renderStep("hermes", "ws://localhost:18789");
    expect(screen.getByText(/hermes-adapter/)).toBeTruthy();
  });
});
