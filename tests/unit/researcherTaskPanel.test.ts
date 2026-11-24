import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { agentStoreReducer, initialAgentStoreState } from "@/features/agents/state/store";
import { ResearcherTaskPanel, type ResearcherTaskPanelProps } from "@/features/research-lab/ResearcherTaskPanel";

function props(): ResearcherTaskPanelProps {
 const agent=agentStoreReducer(initialAgentStoreState,{type:"hydrateAgents",agents:[{agentId:"researcher-1",name:"실제 연구원",sessionKey:"agent:researcher-1:main"}]}).agents[0];
 return {agent,connected:true,models:[],stopBusy:false,onDraftChange:vi.fn(),onSend:vi.fn(),onStop:vi.fn(),onNewSession:vi.fn(),onRemoveQueued:vi.fn(),onClose:vi.fn(),onModelChange:vi.fn()};
}
afterEach(cleanup);
describe("research task conversation",()=>{
 it("submits exactly the instruction once and preserves ordinary Enter for multiline text",()=>{
  const p=props();render(React.createElement(ResearcherTaskPanel,p));
  const input=screen.getByRole("textbox",{name:"작업 지시"});
  fireEvent.change(input,{target:{value:"자료 검토\n표로 정리"}});
  fireEvent.keyDown(input,{key:"Enter"});expect(p.onSend).not.toHaveBeenCalled();
  fireEvent.keyDown(input,{key:"Enter",ctrlKey:true});
  expect(p.onSend).toHaveBeenCalledExactlyOnceWith("자료 검토\n표로 정리");expect(input).toHaveValue("");
  expect(screen.queryByTestId("agent-avatar-customize")).not.toBeInTheDocument();
 });
 it("shows real running status and queued requests with stop and cancel actions",()=>{
  const p=props();p.agent={...p.agent,status:"running",queuedMessages:["후속 요청"],outputLines:["> 현재 요청"]};
  render(React.createElement(ResearcherTaskPanel,p));
  expect(screen.getByRole("status")).toHaveTextContent("요청을 처리");
  fireEvent.click(screen.getByRole("button",{name:"작업 중단"}));expect(p.onStop).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button",{name:"1번째 대기 요청 취소"}));expect(p.onRemoveQueued).toHaveBeenCalledWith(0);
 });
 it("retains existing results while disconnected and prevents sending",()=>{
  const p=props();p.connected=false;p.agent={...p.agent,draft:"추가 검토",outputLines:["> 기존 요청","보존된 응답"]};
  render(React.createElement(ResearcherTaskPanel,p));
  expect(screen.getByText("보존된 응답")).toBeVisible();expect(screen.getByRole("button",{name:"작업 요청"})).toBeDisabled();expect(screen.getByRole("textbox",{name:"작업 지시"})).toBeDisabled();
 });
});
