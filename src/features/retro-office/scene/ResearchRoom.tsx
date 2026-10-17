"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { RoundedBox, Text, useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { ResearchFurnitureType } from "../core/researchLayout";

type Vec3 = [number, number, number];
type OakSurface = { color: THREE.Texture; relief: THREE.Texture };
const Oak = createContext<OakSurface | null>(null);

/** Low-contrast grain and pores, shared by every oak surface in this room. */
function oakSurface(): OakSurface {
  const width = 512;
  const color = document.createElement("canvas");
  const relief = document.createElement("canvas");
  color.width = color.height = relief.width = relief.height = width;
  const colorContext = color.getContext("2d")!;
  const reliefContext = relief.getContext("2d")!;
  const pixels = colorContext.createImageData(width, width);
  const heights = reliefContext.createImageData(width, width);
  let seed = 137;
  const base = [175, 151, 119];
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) {
    const u = x / width * Math.PI * 2;
    const v = y / width * Math.PI * 2;
    // Periodic along both axes so a large tabletop has no texture-edge seam.
    const bend = 0.48 * Math.sin(u) + 0.17 * Math.sin(u * 2 + Math.sin(v));
    const broad = Math.sin(v * 3 + bend) * 3.8 + Math.sin(v * 7 - bend) * 1.8;
    const fiber = Math.pow(0.5 + 0.5 * Math.sin(v * 37 + bend * 4), 12);
    const pore = random() > 0.993 ? 4 : 0;
    const variation = broad - fiber * 5 - pore + (random() - 0.5) * 1.5;
    const offset = (y * width + x) * 4;
    for (let channel = 0; channel < 3; channel++) {
      pixels.data[offset + channel] = base[channel] + variation;
      heights.data[offset + channel] = 155 - fiber * 35 - pore * 12;
    }
    pixels.data[offset + 3] = heights.data[offset + 3] = 255;
  }
  colorContext.putImageData(pixels, 0, 0);
  reliefContext.putImageData(heights, 0, 0);
  const colorMap = new THREE.CanvasTexture(color);
  const reliefMap = new THREE.CanvasTexture(relief);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  for (const map of [colorMap, reliefMap]) {
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
  }
  return { color: colorMap, relief: reliefMap };
}

/** Deterministic, authored surface maps. No reference bitmap is shipped with the app. */
function fabricSurface(color = "#92998a") {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  let seed = 41;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 2) for (let x = 0; x < 256; x += 2) {
    ctx.fillStyle = `rgba(${random() > 0.5 ? "255,255,240" : "50,48,40"},${random() * 0.09})`;
    ctx.fillRect(x, y, 1, 2);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return map;
}

export function ResearchMaterials({ children }: { children: ReactNode }) {
  const oak = useMemo(() => oakSurface(), []);
  useEffect(() => () => { oak.color.dispose(); oak.relief.dispose(); }, [oak]);
  return <Oak.Provider value={oak}>{children}</Oak.Provider>;
}

export function LabBox({ size, at = [0, 0, 0], color = "#3f403d", wood = false, metal = false, radius = 0.008, rotation }: { size: Vec3; at?: Vec3; color?: string; wood?: boolean; metal?: boolean; radius?: number; rotation?: Vec3 }) {
  const oak = useContext(Oak);
  return <RoundedBox args={size} position={at} rotation={rotation} radius={Math.min(radius, Math.min(...size) / 3)} smoothness={2} castShadow receiveShadow>
    <meshStandardMaterial color={wood ? "#ffffff" : color} map={wood ? oak?.color : null} bumpMap={wood ? oak?.relief : null} bumpScale={0.003} metalness={metal ? 0.25 : 0} roughness={wood ? 0.72 : metal ? 0.55 : 0.86} />
  </RoundedBox>;
}

function Book({ at, width = 0.055, height = 0.29, color = "#d8d4c8" }: { at: Vec3; width?: number; height?: number; color?: string }) {
  return <group position={at}>
    <LabBox size={[width, height, 0.22]} at={[0, height / 2, 0]} color={color} radius={0.002} />
    <LabBox size={[width * 0.55, height * 0.5, 0.003]} at={[0, height * 0.58, 0.112]} color="#dcd9cc" radius={0.001} />
    <mesh position={[0, height * 0.2, 0.115]}><circleGeometry args={[0.007, 8]} /><meshStandardMaterial color="#55584d" /></mesh>
  </group>;
}

function createLeafGeometry() {
  const vertices: number[] = [], indices: number[] = [];
  const segments = 12;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const width = 0.085 * Math.pow(Math.sin(Math.PI * t), 0.8);
    const arch = Math.sin(Math.PI * t) * 0.055 - t * t * 0.08;
    for (const side of [-1, 0, 1]) vertices.push(side * width, t * 0.38, arch + (side === 0 ? 0.022 * Math.sin(Math.PI * t) : 0));
    if (i < segments) for (let j = 0; j < 2; j++) {
      const a = i * 3 + j;
      indices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

export function LabPlant({ at = [0, 0, 0], scale = 1 }: { at?: Vec3; scale?: number }) {
  const leaf = useMemo(() => createLeafGeometry(), []);
  const leaves = useRef<THREE.InstancedMesh>(null);
  const stems = useRef<THREE.InstancedMesh>(null);
  useEffect(() => () => leaf.dispose(), [leaf]);
  useLayoutEffect(() => {
    if (!leaves.current || !stems.current) return;
    const local = new THREE.Object3D();
    const around = new THREE.Matrix4();
    const matrix = new THREE.Matrix4();
    const colors = ["#6f8847", "#9b9f5b", "#4e733c", "#87974d"].map(color => new THREE.Color(color));
    for (let i = 0; i < 24; i++) {
      const height = 0.43 + (i % 7) * 0.055;
      around.makeRotationY(i * 2.399);
      local.position.set(0.04, (height + 0.32) / 2, 0);
      local.rotation.set(0, 0, -0.2);
      local.scale.set(1, height - 0.3, 1);
      local.updateMatrix();
      stems.current.setMatrixAt(i, matrix.multiplyMatrices(around, local.matrix));
      local.position.set(0.08, height, 0);
      local.rotation.set(0.2, i % 2 * 0.3, -0.55 - (i % 4) * 0.18);
      local.scale.setScalar(0.65 + (i % 4) * 0.12);
      local.updateMatrix();
      leaves.current.setMatrixAt(i, matrix.multiplyMatrices(around, local.matrix));
      leaves.current.setColorAt(i, colors[i % colors.length]);
    }
    for (const mesh of [leaves.current, stems.current]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    if (leaves.current.instanceColor) leaves.current.instanceColor.needsUpdate = true;
  }, []);
  return <group position={at} scale={scale}>
    <mesh position={[0, 0.17, 0]} castShadow receiveShadow><cylinderGeometry args={[0.18, 0.135, 0.34, 24]} /><meshStandardMaterial color="#d9d6c9" roughness={0.95} /></mesh>
    <mesh position={[0, 0.343, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.163, 24]} /><meshStandardMaterial color="#4e4738" /></mesh>
    <instancedMesh ref={stems} args={[undefined, undefined, 24]} castShadow><cylinderGeometry args={[0.004, 0.007, 1, 6]} /><meshStandardMaterial color="#687e44" /></instancedMesh>
    <instancedMesh ref={leaves} args={[leaf, undefined, 24]} castShadow receiveShadow><meshStandardMaterial side={THREE.DoubleSide} roughness={0.7} /></instancedMesh>
  </group>;
}

function Cabinet({ booksOnly = false }: { booksOnly?: boolean }) {
  return <group>
    <LabBox size={[2.55, 0.77, 0.48]} at={[0, 0.425, 0]} metal />
    <LabBox size={[2.61, 0.045, 0.53]} at={[0, 0.83, 0]} wood />
    {[-0.95, -0.317, 0.317, 0.95].map(x => <LabBox key={x} size={[0.625, 0.74, 0.025]} at={[x, 0.44, 0.253]} color="#454542" metal />)}
    <LabBox size={[2.35, 0.07, 0.38]} at={[0, 0.035, 0]} color="#313330" />
    <LabPlant at={[-1, 0.855, 0]} scale={0.42} />
    {booksOnly ? <>
      {[0, 1, 2].map(i => <group key={i} position={[-0.67 + i * 0.02, 0.88 + i * 0.055, 0.04]} rotation={[0, i * 0.09, 0]}>
        <LabBox size={[0.41, 0.05, 0.28]} color={["#4f5548", "#ad9a77", "#42483f"][i]} />
        <LabBox size={[0.38, 0.032, 0.267]} at={[0, 0, 0.009]} color="#e2dbca" />
      </group>)}
      <LabPlant at={[0.97, 0.855, 0]} scale={0.5} />
    </> : <>
    {[0, 1, 2, 3].map(i => <Book key={i} at={[-0.59 + i * 0.065, 0.855, 0]} height={0.26 + (i % 2) * 0.035} color={["#d2cdb6", "#7e8a72", "#e7dfcc", "#b3ac94"][i]} />)}
    <group position={[0.62, 0.855, -0.03]} rotation={[-0.1, 0, 0]}>
      <LabBox size={[0.36, 0.43, 0.025]} at={[0, 0.215, 0]} color="#393b36" />
      <LabBox size={[0.31, 0.38, 0.008]} at={[0, 0.215, 0.02]} color="#e8e1d1" />
      <LabBox size={[0.21, 0.27, 0.004]} at={[0, 0.22, 0.026]} color="#b7a88f" />
    </group>
    <LabBox size={[0.31, 0.04, 0.23]} at={[-0.05, 0.88, 0.04]} color="#e3ded2" />
    </>}
  </group>;
}

function Shelf() {
  return <group>
    {[-0.48, 0.48].map(x => [-0.2, 0.2].map(z => <LabBox key={`${x}:${z}`} size={[0.045, 2.32, 0.045]} at={[x, 1.16, z]} metal />))}
    {[0.14, 0.84, 1.56, 2.3].map((y, level) => <group key={y}>
      <LabBox size={[1.01, 0.035, 0.47]} at={[0, y, 0]} wood />
      {level === 3 ? null : level % 2 === 0 ? <>
        <LabBox size={[0.43, 0.4, 0.34]} at={[0.17, y + 0.22, 0]} color={level === 0 ? "#b2afa5" : "#474a43"} />
        <LabBox size={[0.13, 0.036, 0.006]} at={[0.17, y + 0.22, 0.173]} color="#d2cdbf" />
        {[0, 1, 2].map(i => <Book key={i} at={[-0.34 + i * 0.065, y + 0.02, 0.02]} height={0.36 + i * 0.025} color={["#777f70", "#b4ad98", "#d6d4c9"][i]} />)}
      </> : <>
        {[0, 1, 2, 3, 4].map(i => <Book key={i} at={[-0.31 + i * 0.074, y + 0.02, 0]} height={0.38 + (i % 3) * 0.025} color={["#444b42", "#d0cbbd", "#a7aa99", "#e0dbd0", "#b7ad97"][i]} />)}
        <LabBox size={[0.21, 0.24, 0.3]} at={[0.29, y + 0.14, 0]} color="#55574f" />
      </>}
    </group>)}
  </group>;
}

function Monitor({ x, tilt = 0 }: { x: number; tilt?: number }) {
  return <group position={[x, 0.82, -0.19]} rotation={[0, tilt, 0]}>
    <mesh position={[-0.09, 0.006, -0.065]} castShadow receiveShadow><cylinderGeometry args={[0.065, 0.075, 0.012, 24]} /><meshStandardMaterial color="#363935" metalness={0.3} roughness={0.5} /></mesh>
    <mesh position={[-0.09, 0.163, -0.065]} castShadow><cylinderGeometry args={[0.014, 0.014, 0.314, 16]} /><meshStandardMaterial color="#555951" metalness={0.45} roughness={0.4} /></mesh>
    <LabBox size={[0.12, 0.026, 0.035]} at={[-0.04, 0.28, -0.065]} metal />
    <LabBox size={[0.045, 0.085, 0.065]} at={[0, 0.305, -0.04]} metal radius={0.009} />
    <LabBox size={[0.13, 0.13, 0.015]} at={[0, 0.33, -0.022]} color="#41453f" />
    <LabBox size={[0.56, 0.35, 0.028]} at={[0, 0.33, 0]} color="#292c2b" />
    <LabBox size={[0.523, 0.313, 0.004]} at={[0, 0.33, 0.018]} color="#38413f" />
    {[0, 1, 2, 3, 4, 5].map(i => <LabBox key={i} size={[0.12 + i % 3 * 0.06, 0.007, 0.001]} at={[-0.08 + i % 2 * 0.03, 0.43 - i * 0.032, 0.022]} color={i % 3 === 0 ? "#98a48b" : "#687a76"} radius={0.0003} />)}
  </group>;
}

function Chair({ at = [0.64, 0, 0.74], upholstery = "#4b4c47" }: { at?: Vec3; upholstery?: string }) {
  return <group position={at} rotation={[0, Math.PI, 0]}>
    <LabBox size={[0.49, 0.07, 0.45]} at={[0, 0.48, 0]} color={upholstery} radius={0.035} />
    <LabBox size={[0.47, 0.48, 0.065]} at={[0, 0.78, -0.22]} color={upholstery} radius={0.04} rotation={[-0.09, 0, 0]} />
    <mesh position={[0, 0.255, 0]} castShadow><cylinderGeometry args={[0.03, 0.04, 0.43, 16]} /><meshStandardMaterial color="#454742" metalness={0.35} roughness={0.55} /></mesh>
    {Array.from({ length: 5 }, (_, i) => <group key={i} rotation={[0, i * Math.PI * 0.4, 0]}><LabBox size={[0.04, 0.03, 0.3]} at={[0, 0.07, 0.12]} /><mesh position={[0, 0.045, 0.28]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.037, 0.037, 0.04, 12]} /><meshStandardMaterial color="#333631" /></mesh></group>)}
    {[-0.27, 0.27].map(x => <group key={x}><LabBox size={[0.028, 0.21, 0.03]} at={[x, 0.54, 0]} /><LabBox size={[0.06, 0.025, 0.3]} at={[x, 0.655, 0]} radius={0.01} /></group>)}
  </group>;
}

function Workstation({ shared = false }: { shared?: boolean }) {
  const fabric = useMemo(() => fabricSurface(), []);
  useEffect(() => () => fabric.dispose(), [fabric]);
  return <group>
    <LabBox size={[1.96, 0.055, shared ? 1.5 : 0.94]} at={[0, 0.79, shared ? -0.28 : 0]} wood radius={0.012} />
    {[-0.91, 0.91].map(x => <group key={x}>
      {[shared ? -0.95 : -0.39, 0.39].map(z => <LabBox key={z} size={[0.045, 0.76, 0.045]} at={[x, 0.38, z]} metal />)}
      <LabBox size={[0.045, 0.04, shared ? 1.38 : 0.82]} at={[x, 0.035, shared ? -0.28 : 0]} metal />
    </group>)}
    <LabBox size={[1.8, 0.065, 0.035]} at={[0, 0.7, -0.38]} />
    <LabBox size={[0.39, 0.63, 0.58]} at={[-0.61, 0.34, -0.05]} />
    {[0.19, 0.4, 0.57].map(y => <group key={y}><LabBox size={[0.36, 0.16, 0.02]} at={[-0.61, y, 0.25]} color="#4b4d47" /><LabBox size={[0.085, 0.012, 0.015]} at={[-0.61, y + 0.045, 0.266]} color="#292e29" /></group>)}
    <LabBox size={[0.27, 0.49, 0.45]} at={[-0.28, 0.28, -0.22]} color="#343834" />
    <RoundedBox args={[1.34, 0.39, 0.043]} position={[-0.25, 1.03, -0.33]} radius={0.012} smoothness={2} castShadow receiveShadow><meshStandardMaterial map={fabric} roughness={1} /></RoundedBox>
    {!shared && <><Monitor x={-0.25} tilt={0.08} /><Monitor x={0.36} tilt={-0.12} /></>}
    {shared && <group position={[0, 0, -0.64]} rotation={[0, Math.PI, 0]}>
      <Monitor x={0.1} tilt={-0.1} />
      <LabBox size={[0.47, 0.019, 0.16]} at={[0.1, 0.831, 0.13]} color="#303630" />
      {Array.from({ length: 4 }, (_, row) => Array.from({ length: 13 }, (_, col) => <LabBox key={`${row}:${col}`} size={[0.026, 0.004, 0.024]} at={[-0.107 + col * 0.034, 0.843, 0.075 + row * 0.034]} color="#7c8176" radius={0.001} />))}
      <LabBox size={[0.24, 0.024, 0.28]} at={[-0.55, 0.835, 0.08]} color="#748064" />
      <LabBox size={[0.21, 0.012, 0.255]} at={[-0.55, 0.837, 0.085]} color="#e8e1d2" />
      <LabPlant at={[0.78, 0.82, 0]} scale={0.35} />
    </group>}
    {!shared && <>
      <LabBox size={[0.47, 0.019, 0.16]} at={[0.6, 0.831, 0.32]} color="#303630" />
      {Array.from({ length: 4 }, (_, row) => Array.from({ length: 13 }, (_, col) => <LabBox key={`${row}:${col}`} size={[0.026, 0.004, 0.024]} at={[0.393 + col * 0.034, 0.843, 0.265 + row * 0.034]} color="#7c8176" radius={0.001} />))}
      <LabBox size={[0.07, 0.025, 0.1]} at={[0.88, 0.838, 0.31]} color="#969a8d" radius={0.018} />
    </>}
    <LabBox size={[0.23, 0.024, 0.29]} at={[0.75, 0.835, 0.08]} color="#6a7663" />
    <LabBox size={[0.214, 0.012, 0.275]} at={[0.75, 0.837, 0.084]} color="#e8e1d2" />
    <LabPlant at={[-0.79, 0.82, -0.22]} scale={0.34} />
    <group position={[-0.63, 0.82, 0.24]}>
      <LabBox size={[0.42, 0.018, 0.23]} at={[0, 0.009, 0]} color="#41473d" />
      {[-0.203, 0.203].map(x => <LabBox key={x} size={[0.014, 0.14, 0.23]} at={[x, 0.075, 0]} color="#41473d" />)}
      {[-0.108, 0.108].map(z => <LabBox key={z} size={[0.42, 0.1, 0.014]} at={[0, 0.055, z]} color="#41473d" />)}
      {[0, 1, 2].map(i => <Book key={i} at={[-0.135 + i * 0.075, 0.018, 0]} width={0.06} height={0.23 + i % 2 * 0.035} color={["#ece4cf", "#7e886c", "#b9ae8c"][i]} />)}
    </group>
    <mesh position={[-0.07, 0.891, 0.29]} castShadow><cylinderGeometry args={[0.044, 0.04, 0.145, 16]} /><meshStandardMaterial color="#55594c" /></mesh>
    <Chair />
    {shared && <Chair at={[-0.45, 0, 0.74]} upholstery="#8a917b" />}
  </group>;
}

function PrivacyDivider() {
  const fabric = useMemo(() => fabricSurface("#c3c0b7"), []);
  useEffect(() => () => fabric.dispose(), [fabric]);
  return <group>
    <RoundedBox args={[1.45, 1.25, 0.065]} position={[0, 0.86, 0]} radius={0.025} smoothness={3} castShadow receiveShadow><meshStandardMaterial map={fabric} roughness={1} /></RoundedBox>
    {[-0.55, 0.55].map(x => <group key={x}><LabBox size={[0.045, 0.3, 0.045]} at={[x, 0.15, 0]} /><LabBox size={[0.08, 0.025, 0.42]} at={[x, 0.025, 0]} /></group>)}
    <LabBox size={[1.3, 0.24, 0.29]} at={[0, 0.16, 0.26]} color="#626858" />
    {[-0.42, -0.14, 0.14, 0.42].map(x => <LabPlant key={x} at={[x, 0.14, 0.26]} scale={0.7} />)}
  </group>;
}

function BookWorkbench() {
  return <group>
    <LabBox size={[1.8, 0.055, 0.82]} at={[0, 0.79, 0]} wood radius={0.012} />
    {[-0.83, 0.83].map(x => [-0.34, 0.34].map(z => <LabBox key={`${x}:${z}`} size={[0.045, 0.76, 0.045]} at={[x, 0.38, z]} />))}
    {[0.1, 0.42].map((y, level) => <group key={y}>
      <LabBox size={[1.64, 0.035, 0.71]} at={[0, y, 0]} wood />
      {Array.from({ length: 7 }, (_, i) => <Book key={i} at={[-0.68 + i * 0.075, y + 0.025, 0.17]} height={0.22 + (i % 3) * 0.025} color={["#e0dbcd", "#737e6b", "#b7b29e"][i % 3]} />)}
      <LabBox size={[0.5, 0.22, 0.49]} at={[0.45, y + 0.13, 0.06]} color={level ? "#bdb8ab" : "#575b51"} />
      <LabBox size={[0.13, 0.025, 0.006]} at={[0.45, y + 0.16, 0.309]} color="#ddd8ca" />
    </group>)}
  </group>;
}

export function ResearchFurniture({ type, booksOnly = false, sharedDesk = false }: { type: ResearchFurnitureType; booksOnly?: boolean; sharedDesk?: boolean }) {
  if (type === "workstation") return <Workstation shared={sharedDesk} />;
  if (type === "cabinet") return <group scale={[0.85, 0.83, 1]}><Cabinet booksOnly={booksOnly} /></group>;
  if (type === "shelf") return <group scale={[0.85, 0.82, 1]}><Shelf /></group>;
  if (type === "divider") return <PrivacyDivider />;
  if (type === "workbench") return <BookWorkbench />;
  return <LabPlant scale={1} />;
}

function Noticeboard() {
  return <group position={[-1.2, 1.4, -2.23]} scale={0.9}>
    <LabBox size={[1.95, 1.1, 0.045]} color="#a19a8a" />
    <LabBox size={[1.9, 1.05, 0.02]} at={[0, 0, 0.035]} color="#e2dace" />
    {[-0.66, -0.23, 0.22, 0.63].map((x, i) => <group key={x} position={[x, i % 2 ? -0.12 : 0.09, 0.05]} rotation={[0, 0, (i - 1.5) * 0.025]}>
      <LabBox size={[0.3, 0.4, 0.004]} color={i === 1 ? "#97a088" : "#f6f0e3"} />
      {Array.from({ length: 8 }, (_, line) => <LabBox key={line} size={[0.22, 0.003, 0.001]} at={[0, 0.1 - line * 0.025, 0.003]} color="#aaa89a" radius={0.0002} />)}
      <mesh position={[0, 0.18, 0.01]}><sphereGeometry args={[0.009, 8, 6]} /><meshStandardMaterial color="#ad9670" /></mesh>
    </group>)}
  </group>;
}

function GlazedDoorway({ at, rotation = 0 }: { at: Vec3; rotation?: number }) {
  return <group position={at} rotation={[0, rotation, 0]}>
    {[-0.67, 0.67].map(x => <LabBox key={x} size={[0.075, 3.2, 0.12]} at={[x, 1.6, 0]} color="#494b46" />)}
    <LabBox size={[1.42, 0.095, 0.12]} at={[0, 3.15, 0]} color="#494b46" />
    <mesh position={[0, 1.58, 0]}><planeGeometry args={[1.28, 3.05]} /><meshStandardMaterial color="#aeb8ae" transparent opacity={0.16} roughness={0.17} metalness={0.15} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    <LabBox size={[1.24, 0.08, 0.025]} at={[0, 0.93, 0.02]} color="#939a8b" />
    <LabBox size={[0.027, 0.48, 0.04]} at={[-0.43, 1.4, 0.09]} color="#c1beb0" />
    <LabBox size={[1.6, 3.3, 0.1]} at={[0, 1.65, -0.9]} color="#e6e2d8" />
    <LabBox size={[1.45, 0.09, 0.06]} at={[0, 0.94, -0.8]} color="#a4a79c" />
  </group>;
}

export function ResearchArchitecture() {
  const sources = useTexture([
    "/office-assets/textures/research/floor-color.jpg",
    "/office-assets/textures/research/floor-normal.jpg",
    "/office-assets/textures/research/floor-roughness.jpg",
  ]);
  const floor = useMemo(() => sources.map((source, index) => {
    const map = source.clone();
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    // The source contains 3 × 3 tiles; each tile is about 0.75 m here.
    map.repeat.set(16 / 2.25, 16 / 2.25);
    map.colorSpace = index === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    map.anisotropy = 4;
    map.needsUpdate = true;
    return map;
  }), [sources]);
  useEffect(() => () => floor.forEach(map => map.dispose()), [floor]);
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[16, 16]} /><meshStandardMaterial map={floor[0]} normalMap={floor[1]} normalScale={[0.12, 0.12]} roughnessMap={floor[2]} roughness={0.82}
      onBeforeCompile={shader => {
        // Keep the scanned tile variation subtle in the clean indoor palette.
        shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>\ndiffuseColor.rgb = mix(vec3(0.36), diffuseColor.rgb, 0.5);");
      }} /></mesh>
    {/* Two internal glazed doors frame the room, as in the approved view. */}
    <LabBox size={[0.1, 3.6, 4.65]} at={[-3.54, 1.8, -0.525]} color="#e7e1d6" />
    <LabBox size={[0.1, 3.6, 4.95]} at={[-3.54, 1.8, 5.675]} color="#e7e1d6" />
    <LabBox size={[0.1, 0.4, 1.4]} at={[-3.54, 3.4, 2.5]} color="#e7e1d6" />
    <LabBox size={[3.63, 3.6, 0.1]} at={[-1.735, 1.8, -2.3]} color="#ece6db" />
    <LabBox size={[0.025, 0.09, 4.65]} at={[-3.48, 0.045, -0.525]} color="#737568" />
    <LabBox size={[0.025, 0.09, 4.95]} at={[-3.48, 0.045, 5.675]} color="#737568" />
    <LabBox size={[3.58, 0.09, 0.025]} at={[-1.72, 0.045, -2.24]} color="#737568" />
    <group position={[-3.47, 1.65, 0.4]} rotation={[0, Math.PI / 2, 0]}>
      <Text fontSize={0.27} fontWeight={700} color="#30342e" letterSpacing={0.025}>REVELARE</Text>
      <Text position={[0, -0.245, 0]} fontSize={0.105} color="#41463a" letterSpacing={0.12}>SECURITY LABS</Text>
      <LabBox size={[1.43, 0.055, 0.1]} at={[0, 0.3, 0.045]} color="#87966d" />
      <mesh position={[0, 0.275, 0.07]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[1.25, 0.07]} /><meshBasicMaterial color="#f8e5ab" /></mesh>
    </group>
    <Noticeboard />
    <GlazedDoorway at={[0.75, 0, -2.28]} />
    <GlazedDoorway at={[-3.52, 0, 2.5]} rotation={Math.PI / 2} />
  </group>;
}
