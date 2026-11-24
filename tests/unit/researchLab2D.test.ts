import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResearchLab2D } from "@/features/research-lab/ResearchLab2D";
vi.mock("@/features/office/components/panels/SettingsPanel", () => ({ SettingsPanel: () => null }));
const makeProps = () => ({
  agents: [{ id: "researcher-1", name: "실제 연구원", status: "idle" as const, color: "#637958", item: "books" }],
  officeTitle: "연구실", officeTitleLoaded: true, renderMode: "lab" as const,
  onRenderModeChange: vi.fn(), onAgentChatSelect: vi.fn(), gatewayStatus: "connected", gatewayToken: "must-not-enter-scene",
  remoteOfficeEnabled: false, remoteOfficeSourceKind: "presence_endpoint" as const, remoteOfficeLabel: "", remoteOfficePresenceUrl: "", remoteOfficeGatewayUrl: "", remoteOfficeTokenConfigured: false,
  voiceRepliesEnabled: false, voiceRepliesVoiceId: null, voiceRepliesSpeed: 1, voiceRepliesLoaded: true,
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const available = (value = true) => vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ available: value }))));
describe("research laboratory host", () => {
  it("accepts selection only from its scene window, own origin and current roster", async () => {
    available(); const props = makeProps(); render(React.createElement(ResearchLab2D, props));
    const iframe = await screen.findByTitle("2.5D 연구실") as HTMLIFrameElement;
    const send = (origin: string, source: Window | null, id: string) => fireEvent(window, new MessageEvent("message", { origin, source, data: {version: 1, type: "research-lab:select", agentId: id} }));
    send("https://invalid.example", iframe.contentWindow, "researcher-1");
    send(window.location.origin, window, "researcher-1");
    send(window.location.origin, iframe.contentWindow, "removed-agent");
    expect(props.onAgentChatSelect).not.toHaveBeenCalled();
    send(window.location.origin, iframe.contentWindow, "researcher-1");
    expect(props.onAgentChatSelect).toHaveBeenCalledWith("researcher-1");
    fireEvent.click(screen.getByRole("button", { name: "실제 연구원 · 대기 · 대화 열기" }));
    expect(props.onAgentChatSelect).toHaveBeenCalledTimes(2);
  });
  it("pushes live state after ready and updates, without gateway credentials", async () => {
    available(); const props = makeProps(), view = render(React.createElement(ResearchLab2D, props));
    const iframe = await screen.findByTitle("2.5D 연구실") as HTMLIFrameElement, post = vi.spyOn(iframe.contentWindow!, "postMessage");
    act(() => { window.dispatchEvent(new MessageEvent("message", { origin: window.location.origin, source: iframe.contentWindow, data: {version: 1, type: "research-lab:ready"} })); });
    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(JSON.stringify(post.mock.calls)).not.toContain(props.gatewayToken);
    view.rerender(React.createElement(ResearchLab2D, { ...props, agents: [{...props.agents[0], status: "working" as const}], selectedAgentId: "researcher-1" }));
    await waitFor(() => expect(post.mock.lastCall?.[0]).toMatchObject({ connected: true, selectedId: "researcher-1", agents: [{id: "researcher-1", status: "working", slot: "finn"}] }));
    view.rerender(React.createElement(ResearchLab2D, {...props, agents: []}));
    await waitFor(() => expect(post.mock.lastCall?.[0]).toMatchObject({ agents: [] }));
  });
  it("offers an existing renderer when private assets are unavailable", async () => {
    available(false); const props = makeProps(); render(React.createElement(ResearchLab2D, props));
    fireEvent.click(await screen.findByRole("button", { name: "픽셀 오피스 열기" }));
    expect(props.onRenderModeChange).toHaveBeenCalledWith("2d");
    expect(screen.queryByTitle("2.5D 연구실")).toBeNull();
  });
});
