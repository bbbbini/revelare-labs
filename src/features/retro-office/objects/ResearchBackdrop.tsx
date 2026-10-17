import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";
import type { FurnitureItem, RenderAgent } from "../core/types";
import { getItemRotationRadians, toWorld } from "../core/geometry";
import { getRenderedDeskCenter } from "../core/navigation";
import type { MutableRefObject } from "react";

function Block({ size, at, color }: { size: [number, number, number]; at: [number, number, number]; color: string }) {
  return <RoundedBox args={size} radius={0.012} smoothness={2} position={at} castShadow receiveShadow><meshStandardMaterial color={color} roughness={0.85} /></RoundedBox>;
}
function Plant({ at, small = false }: { at: [number, number, number]; small?: boolean }) {
  return <group position={at} scale={small ? 0.38 : 1}>
    <mesh position={[0, 0.16, 0]} castShadow><cylinderGeometry args={[0.17, 0.13, 0.32, 24]} /><meshStandardMaterial color="#e8e2d5" roughness={0.95} /></mesh>
    {Array.from({ length: 12 }, (_, i) => {
      const angle = i * 2.4;
      return <mesh key={i} position={[Math.sin(angle) * 0.12, 0.43 + i % 4 * 0.08, Math.cos(angle) * 0.12]} rotation={[Math.cos(angle) * 0.5, angle, Math.sin(angle) * 0.6]} scale={[0.09, 0.22, 0.025]} castShadow><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color={i % 2 ? "#778b59" : "#4d693f"} roughness={0.9} /></mesh>;
    })}
  </group>;
}

/** Non-persisted architectural dressing for the focused desk view. No collision or layout writes. */
export function ResearchBackdrop({ items, agents }: { items: FurnitureItem[]; agents: MutableRefObject<RenderAgent[]> }) {
  const root = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!root.current) return;
    const agent = agents.current[0];
    const desks = items.filter(item => item.type === "desk_cubicle");
    const desk = desks.reduce<FurnitureItem | null>((best, item) => {
      if (!best || !agent) return best ?? item;
      const a = getRenderedDeskCenter(item), b = getRenderedDeskCenter(best);
      return Math.hypot(a.x - agent.x, a.y - agent.y) < Math.hypot(b.x - agent.x, b.y - agent.y) ? item : best;
    }, null);
    root.current.visible = Boolean(desk);
    if (!desk) return;
    const center = getRenderedDeskCenter(desk);
    const [x, , z] = toWorld(center.x, center.y);
    root.current.position.set(x, 0, z);
    root.current.rotation.y = getItemRotationRadians(desk) + Math.PI;
  });
  return <group ref={root}>
    <Block size={[6.2, 0.025, 5.4]} at={[0, -0.017, -0.3]} color="#b6b1a6" />
    <Block size={[6.2, 2.5, 0.055]} at={[0, 1.25, -2.5]} color="#e4dece" />
    <Block size={[0.055, 2.5, 3.2]} at={[-3.05, 1.25, -0.9]} color="#e6e0d3" />
    {[-2.15, -1.15].map(x => <group key={x} position={[x, 0, -2.2]}>
      <Block size={[0.88, 0.65, 0.44]} at={[0, 0.35, 0]} color="#464b45" />
      <Block size={[0.94, 0.045, 0.49]} at={[0, 0.7, 0]} color="#b59973" />
      <Block size={[0.007, 0.57, 0.006]} at={[0, 0.36, 0.225]} color="#7d8275" />
      <Plant at={[0.23, 0.73, 0]} small />
      {[0, 1, 2].map(i => <Block key={i} size={[0.035, 0.18 + i * 0.02, 0.12]} at={[-0.2 + i * 0.048, 0.8, 0.04]} color={["#c8c1ac", "#8e9d7e", "#e7dfcd"][i]} />)}
    </group>)}
    <group position={[0.1, 0, -2.23]}>
      {[-0.42, 0.42].map(x => <Block key={x} size={[0.035, 2.15, 0.36]} at={[x, 1.075, 0]} color="#3f4540" />)}
      {[0.2, 0.62, 1.05, 1.48, 1.91].map((y, row) => <group key={y}>
        <Block size={[0.85, 0.03, 0.38]} at={[0, y, 0]} color="#aa8d67" />
        {Array.from({ length: 6 }, (_, i) => <Block key={i} size={[0.06, 0.25 + i % 2 * 0.04, 0.2]} at={[-0.29 + i * 0.087, y + 0.15, 0]} color={["#d1c8b3", "#677260", "#919980", "#e1d8c3"][(i + row) % 4]} />)}
      </group>)}
    </group>
    <Block size={[1.3, 0.9, 0.04]} at={[1.55, 1.55, -2.44]} color="#b9ad90" />
    <Block size={[1.22, 0.82, 0.025]} at={[1.55, 1.55, -2.411]} color="#ded7c5" />
    {[[-0.3, 0.1], [0.08, -0.1], [0.34, 0.12]].map(([x, y], i) => <Block key={i} size={[0.24, 0.31, 0.006]} at={[1.55 + x, 1.55 + y, -2.391]} color={i === 1 ? "#a9b694" : "#f3eddf"} />)}
    <Plant at={[2.4, 0, -1.6]} />
    <Plant at={[-2.6, 0, 0.1]} />
    <Text position={[-1.7, 1.62, -2.455]} fontSize={0.19} color="#3d4538" maxWidth={1.6} anchorX="center">REVELARE</Text>
    <Text position={[-1.7, 1.39, -2.454]} fontSize={0.06} letterSpacing={0.12} color="#5e6854">SECURITY LABS</Text>
  </group>;
}
