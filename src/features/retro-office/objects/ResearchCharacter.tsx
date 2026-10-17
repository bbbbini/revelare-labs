import type { RefObject } from "react";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";

type LimbRef = RefObject<THREE.Group | null>;

/** Procedural, articulated research character. Shares the office's live pose refs. */
export function ResearchCharacter({ skin, hair, shirt, trousers, shoes, leftArm, rightArm, leftLeg, rightLeg }: {
  skin: string; hair: string; shirt: string; trousers: string; shoes: string;
  leftArm: LimbRef; rightArm: LimbRef; leftLeg: LimbRef; rightLeg: LimbRef;
}) {
  const eyes = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (eyes.current) eyes.current.scale.y = clock.elapsedTime % 4.8 > 4.65 ? 0.12 : 1;
  });
  return <group>
    {[{ ref: rightLeg, x: -0.043 }, { ref: leftLeg, x: 0.043 }].map(({ ref, x }, i) => <group key={i} ref={ref} position={[x, 0.18, 0]}>
      <mesh position={[0, -0.075, 0]} castShadow><capsuleGeometry args={[0.032, 0.12, 6, 12]} /><meshStandardMaterial color={trousers} roughness={0.9} /></mesh>
      <RoundedBox args={[0.068, 0.045, 0.105]} radius={0.02} position={[0, -0.155, 0.025]} castShadow><meshStandardMaterial color={shoes} roughness={0.8} /></RoundedBox>
      <RoundedBox args={[0.069, 0.009, 0.107]} radius={0.004} position={[0, -0.176, 0.025]}><meshStandardMaterial color="#d6d1c6" /></RoundedBox>
    </group>)}
    <mesh position={[0, 0.25, 0]} scale={[1, 0.8, 0.65]} castShadow><sphereGeometry args={[0.08, 20, 16]} /><meshStandardMaterial color={trousers} roughness={0.85} /></mesh>
    <mesh position={[0, 0.36, 0]} scale={[0.092, 0.13, 0.062]} castShadow><sphereGeometry args={[1, 24, 20]} /><meshStandardMaterial color={shirt} roughness={0.9} /></mesh>
    <RoundedBox args={[0.062, 0.19, 0.014]} radius={0.005} position={[0, 0.355, 0.056]}><meshStandardMaterial color="#eee9dd" roughness={0.95} /></RoundedBox>
    {[-1, 1].map(side => <group key={side}>
      <RoundedBox args={[0.04, 0.18, 0.019]} radius={0.009} position={[side * 0.046, 0.355, 0.058]} rotation={[0, 0, side * -0.055]}><meshStandardMaterial color={shirt} roughness={0.95} /></RoundedBox>
      <mesh position={[side * 0.031, 0.462, 0.055]} rotation={[0, 0, side * 0.55]} scale={[1, 1.4, 0.4]}><boxGeometry args={[0.031, 0.033, 0.02]} /><meshStandardMaterial color={shirt} /></mesh>
      <RoundedBox args={[0.034, 0.036, 0.012]} radius={0.006} position={[side * 0.055, 0.395, 0.066]}><meshStandardMaterial color={shirt} roughness={0.9} /></RoundedBox>
    </group>)}
    {[{ ref: rightArm, x: -0.105 }, { ref: leftArm, x: 0.105 }].map(({ ref, x }, i) => <group key={i} ref={ref} position={[x, 0.425, 0]}>
      <mesh position={[0, -0.065, 0]} castShadow><capsuleGeometry args={[0.036, 0.085, 6, 12]} /><meshStandardMaterial color={shirt} roughness={0.9} /></mesh>
      <mesh position={[0, -0.13, 0]}><cylinderGeometry args={[0.037, 0.035, 0.025, 16]} /><meshStandardMaterial color="#95a287" roughness={0.9} /></mesh>
      <mesh position={[0, -0.155, 0]} castShadow><capsuleGeometry args={[0.023, 0.027, 6, 12]} /><meshStandardMaterial color={skin} roughness={0.7} /></mesh>
      <mesh position={[x > 0 ? -0.018 : 0.018, -0.158, 0.012]} scale={[0.7, 1, 0.7]}><sphereGeometry args={[0.013, 12, 8]} /><meshStandardMaterial color={skin} /></mesh>
    </group>)}
    <mesh position={[0, 0.49, 0]}><cylinderGeometry args={[0.027, 0.032, 0.054, 16]} /><meshStandardMaterial color={skin} /></mesh>
    <group position={[0, 0.59, 0]}>
      <mesh scale={[0.088, 0.105, 0.077]} castShadow><sphereGeometry args={[1, 32, 24]} /><meshStandardMaterial color={skin} roughness={0.72} /></mesh>
      {[-1, 1].map(side => <mesh key={side} position={[side * 0.084, -0.004, 0]} scale={[0.014, 0.025, 0.016]}><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color={skin} /></mesh>)}
      <mesh position={[0, 0.056, -0.016]} scale={[0.094, 0.063, 0.078]} castShadow><sphereGeometry args={[1, 24, 18]} /><meshStandardMaterial color={hair} roughness={0.85} /></mesh>
      <mesh position={[0, 0.014, -0.053]} scale={[0.088, 0.077, 0.034]} castShadow><sphereGeometry args={[1, 24, 16]} /><meshStandardMaterial color={hair} roughness={0.85} /></mesh>
      {[-1, 1].map(side => <group key={side}>
        <mesh position={[side * 0.042, 0.069, 0.047]} rotation={[0, 0, side * -0.4]} scale={[side < 0 ? 0.061 : 0.041, 0.034, 0.039]} castShadow><sphereGeometry args={[1, 20, 16]} /><meshStandardMaterial color={hair} roughness={0.8} /></mesh>
        <mesh position={[side * 0.075, 0.023, 0.013]} scale={[0.013, 0.044, 0.035]}><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color={hair} /></mesh>
        <mesh position={[side * 0.029, 0.031, 0.072]} rotation={[0, 0, side * 0.12]}><capsuleGeometry args={[0.0025, 0.022, 4, 8]} /><meshStandardMaterial color={hair} /></mesh>
      </group>)}
      <group ref={eyes}>{[-1, 1].map(side => <group key={side} position={[side * 0.029, 0.01, 0.072]}>
        <mesh scale={[0.008, 0.012, 0.004]}><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color="#322c26" roughness={0.5} /></mesh>
        <mesh position={[0.002, 0.004, 0.004]}><sphereGeometry args={[0.002, 8, 6]} /><meshBasicMaterial color="#faf6ee" /></mesh>
      </group>)}</group>
      <mesh position={[0, -0.006, 0.078]} scale={[0.009, 0.012, 0.013]}><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color={skin} /></mesh>
      <mesh position={[0, -0.04, 0.069]} rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[0.0018, 0.018, 4, 8]} /><meshStandardMaterial color="#986b59" /></mesh>
    </group>
  </group>;
}
