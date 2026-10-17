import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { OfficeAgent, RenderAgent } from "../core/types";
import { CANVAS_H, CANVAS_W } from "../core/constants";
import { AgentModel } from "./agents";

/** Render the user's existing avatar without replacing their styles/accessories. */
export function SavedResearchAvatar({ agent, onSelect }: { agent: OfficeAgent; onSelect?: (id: string) => void }) {
  const actors = useRef<RenderAgent[]>([{
    ...agent, x: CANVAS_W / 2, y: CANVAS_H / 2,
    targetX: CANVAS_W / 2, targetY: CANVAS_H / 2,
    path: [], facing: 0, frame: 0, walkSpeed: 0, phaseOffset: 0, state: "sitting",
  }]);
  useEffect(() => { Object.assign(actors.current[0], agent); }, [agent]);
  useFrame((_, delta) => { actors.current[0].frame += delta * 60; });
  return <group scale={1.15}>
    <AgentModel agentId={agent.id} name="" status={agent.status} color={agent.color} appearance={agent.avatarProfile} agentsRef={actors} onClick={onSelect} suppressSpeechBubble />
  </group>;
}
