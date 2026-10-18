"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { RoundedBox, Text, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { toCreasedNormals } from "three-stdlib";
import type { ResearchFurnitureType } from "../core/researchLayout";

type Vec3 = [number, number, number];
type OakSurface = { color: THREE.Texture; normal: THREE.Texture; roughness: THREE.Texture };
const Oak = createContext<OakSurface | null>(null);

/** Deterministic, authored surface maps. No reference bitmap is shipped with the app. */
function fabricSurface(color = "#92998a") {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  let seed = 41;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 256, 256);
  // Heathered yarn: soft light and dark patches, drawn on all sides so the tile wraps.
  for (let i = 0; i < 420; i++) {
    const x = random() * 256, y = random() * 256, r = 1.5 + random() * 3.5;
    ctx.fillStyle = `rgba(${random() > 0.5 ? "255,252,236" : "38,40,34"},${0.03 + random() * 0.04})`;
    for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) {
      ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Plain weave: alternating warp and weft rows read as a fine texture up close.
  for (let y = 0; y < 256; y += 2) for (let x = 0; x < 256; x += 2) {
    ctx.fillStyle = `rgba(${(x + y) % 4 ? "255,255,240" : "40,40,34"},${0.05 + random() * 0.07})`;
    ctx.fillRect(x, y, 2, 1);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  // RoundedBox UVs are in metres; one tile spans 35 cm.
  map.repeat.set(1 / 0.35, 1 / 0.35);
  return map;
}

export function ResearchMaterials({ children }: { children: ReactNode }) {
  const sources = useTexture([
    "/office-assets/textures/research/oak-color.jpg",
    "/office-assets/textures/research/oak-normal.jpg",
    "/office-assets/textures/research/oak-roughness.jpg",
  ]);
  const oak = useMemo(() => {
    const maps = sources.map((source, index) => {
      const map = source.clone();
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      // RoundedBox uses object-space UVs. The scan covers 1.8 m, with grain along V.
      map.repeat.set(1 / 1.8, 1 / 1.8);
      map.rotation = Math.PI / 2;
      map.colorSpace = index === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      map.anisotropy = 4;
      map.needsUpdate = true;
      return map;
    });
    return { color: maps[0], normal: maps[1], roughness: maps[2] };
  }, [sources]);
  useEffect(() => () => { oak.color.dispose(); oak.normal.dispose(); oak.roughness.dispose(); }, [oak]);
  return <Oak.Provider value={oak}>{children}</Oak.Provider>;
}

// The scan is raw veneer; a sealed desktop reads with gentler grain contrast.
const softenOakGrain: THREE.MeshStandardMaterial["onBeforeCompile"] = shader => {
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <map_fragment>",
    "#include <map_fragment>\ndiffuseColor.rgb = mix(vec3(0.4, 0.3, 0.21), diffuseColor.rgb, 0.5);",
  );
};

const roundedBoxes = new Map<string, THREE.BufferGeometry>();

/**
 * The same geometry drei's RoundedBox builds (smoothness 2, crease 0.4), made once per size
 * and shared. Hundreds of boxes, many identical such as keyboard keys, otherwise each rebuild
 * their bevel and creased normals on the main thread while the room opens.
 */
function roundedBoxGeometry([width, height, depth]: Vec3, radius: number) {
  const key = `${width},${height},${depth},${radius}`;
  let geometry = roundedBoxes.get(key);
  if (!geometry) {
    const eps = 0.00001, inner = radius - eps;
    const shape = new THREE.Shape();
    shape.absarc(eps, eps, eps, -Math.PI / 2, -Math.PI, true);
    shape.absarc(eps, height - inner * 2, eps, Math.PI, Math.PI / 2, true);
    shape.absarc(width - inner * 2, height - inner * 2, eps, Math.PI / 2, 0, true);
    shape.absarc(width - inner * 2, eps, eps, 0, -Math.PI / 2, true);
    const extruded = new THREE.ExtrudeGeometry(shape, { depth: depth - radius * 2, bevelEnabled: true, bevelSegments: 8, steps: 1, bevelSize: radius - eps, bevelThickness: radius, curveSegments: 2 });
    extruded.center();
    geometry = toCreasedNormals(extruded, 0.4);
    roundedBoxes.set(key, geometry);
  }
  return geometry;
}

export function LabBox({ size, at = [0, 0, 0], color = "#3f403d", wood = false, metal = false, radius = 0.008, rotation }: { size: Vec3; at?: Vec3; color?: string; wood?: boolean; metal?: boolean; radius?: number; rotation?: Vec3 }) {
  const oak = useContext(Oak);
  return <mesh geometry={roundedBoxGeometry(size, Math.min(radius, Math.min(...size) / 3))} position={at} rotation={rotation} castShadow receiveShadow>
    <meshStandardMaterial color={wood ? "#ebe3d9" : color} map={wood ? oak?.color : null} normalMap={wood ? oak?.normal : null} normalScale={[0.06, 0.06]} roughnessMap={wood ? oak?.roughness : null} onBeforeCompile={wood ? softenOakGrain : undefined} metalness={metal ? 0.25 : 0} roughness={wood ? 0.85 : metal ? 0.55 : 0.86} />
  </mesh>;
}

function Book({ at, width = 0.055, height = 0.29, color = "#d8d4c8" }: { at: Vec3; width?: number; height?: number; color?: string }) {
  return <group position={at}>
    <LabBox size={[width, height, 0.22]} at={[0, height / 2, 0]} color={color} radius={0.002} />
    <LabBox size={[width * 0.55, height * 0.5, 0.003]} at={[0, height * 0.58, 0.112]} color="#dcd9cc" radius={0.001} />
    <mesh position={[0, height * 0.2, 0.115]}><circleGeometry args={[0.007, 8]} /><meshStandardMaterial color="#55584d" /></mesh>
  </group>;
}

/** A curved broad leaf, with enough cross-sections for a soft central fold. */
function createLeafGeometry() {
  const vertices: number[] = [], indices: number[] = [];
  const segments = 12, columns = 6;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const width = 0.125 * Math.pow(Math.sin(Math.PI * t), 0.75) * (1.12 - t * 0.3);
    for (let j = 0; j <= columns; j++) {
      const side = j / columns * 2 - 1;
      vertices.push(side * width, t * 0.32,
        Math.sin(Math.PI * t) * (0.038 - side * side * 0.03) - t * t * 0.055);
      if (i < segments && j < columns) {
        const a = i * (columns + 1) + j;
        indices.push(a, a + columns + 1, a + 1, a + 1, a + columns + 1, a + columns + 2);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

/** Branch and leaf instances share their attachment points; no floating foliage. */
export function LabPlant({ at = [0, 0, 0], scale = 1, squarePot = false, trailing = false }: { at?: Vec3; scale?: number; squarePot?: boolean; trailing?: boolean }) {
  const leaf = useMemo(() => createLeafGeometry(), []);
  const leaves = useRef<THREE.InstancedMesh>(null);
  const stems = useRef<THREE.InstancedMesh>(null);
  const potProfile = useMemo(() => [
    [0.125, 0], [0.137, 0.012], [0.174, 0.31], [0.179, 0.33],
    [0.177, 0.342], [0.166, 0.345], [0.162, 0.332], [0.158, 0.305],
  ].map(([radius, height]) => new THREE.Vector2(radius, height)), []);
  useEffect(() => () => leaf.dispose(), [leaf]);
  useLayoutEffect(() => {
    if (!leaves.current || !stems.current) return;
    const local = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);
    const colors = ["#54763d", "#728b48", "#3e6537", "#899552"].map(color => new THREE.Color(color));
    let stemIndex = 0;
    const stem = (start: THREE.Vector3, end: THREE.Vector3, radius: number) => {
      const direction = end.clone().sub(start);
      local.position.copy(start).add(end).multiplyScalar(0.5);
      local.quaternion.setFromUnitVectors(up, direction.clone().normalize());
      local.scale.set(radius, direction.length(), radius);
      local.updateMatrix();
      stems.current!.setMatrixAt(stemIndex++, local.matrix);
    };
    // Trailing stems clear the furniture edge before falling; their leaves face outward.
    for (let branch = 0; branch < 4; branch++) {
      const angle = branch * 2.399;
      let previous = new THREE.Vector3(Math.cos(angle) * 0.035, 0.32, Math.sin(angle) * 0.035);
      for (let node = 0; node < 6; node++) {
        const t = (node + 1) / 6;
        const joint = trailing
          ? new THREE.Vector3((branch - 1.5) * 0.095 + Math.sin(t * 5 + branch) * 0.04,
              0.36 + Math.sin(t * Math.PI) * 0.12 - t * t * (0.72 + branch * 0.12), 0.07 + Math.sin(t * Math.PI / 2) * 0.5)
          : new THREE.Vector3(Math.cos(angle) * (0.035 + t * 0.24),
              0.35 + t * (0.38 + branch * 0.025), Math.sin(angle) * (0.035 + t * 0.24));
        stem(previous, joint, 0.006 - t * 0.0025);
        const outward = angle + (node % 2 ? 0.8 : -0.8);
        const attachment = joint.clone().add(new THREE.Vector3(Math.cos(outward) * 0.055, 0.012, Math.sin(outward) * 0.055));
        stem(joint, attachment, 0.0025);
        local.position.copy(attachment);
        local.rotation.set(trailing ? 1.5 + node * 0.12 : 0.85 + t * 0.35, trailing ? (branch - 1.5) * 0.5 : Math.PI / 2 - outward, 0, "YXZ");
        const length = (trailing ? 0.78 : 1.02) * (1 - t * 0.18) + (branch % 2) * 0.07;
        local.scale.set(length, length, length);
        local.updateMatrix();
        const index = branch * 6 + node;
        leaves.current.setMatrixAt(index, local.matrix);
        leaves.current.setColorAt(index, colors[(branch + node) % colors.length]);
        previous = joint;
      }
    }
    for (const mesh of [leaves.current, stems.current]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    if (leaves.current.instanceColor) leaves.current.instanceColor.needsUpdate = true;
  }, [trailing]);
  return <group position={at} scale={scale}>
    {squarePot ? <>
      <LabBox size={[0.32, 0.34, 0.32]} at={[0, 0.17, 0]} color="#dedbd0" radius={0.024} />
      <LabBox size={[0.28, 0.008, 0.28]} at={[0, 0.344, 0]} color="#4e4738" radius={0.008} />
    </> : <>
      <mesh castShadow receiveShadow><latheGeometry args={[potProfile, 32]} /><meshStandardMaterial color="#dedbd0" roughness={0.82} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 0.319, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.158, 24]} /><meshStandardMaterial color="#494336" /></mesh>
    </>}
    <instancedMesh ref={stems} args={[undefined, undefined, 48]} castShadow><cylinderGeometry args={[0.65, 1, 1, 6]} /><meshStandardMaterial color="#63764a" roughness={0.85} /></instancedMesh>
    <instancedMesh ref={leaves} args={[leaf, undefined, 24]} castShadow receiveShadow><meshStandardMaterial side={THREE.DoubleSide} roughness={0.62} /></instancedMesh>
  </group>;
}

function Cabinet({ booksOnly = false }: { booksOnly?: boolean }) {
  return <group>
    <LabBox size={[2.55, 0.77, 0.48]} at={[0, 0.425, 0]} color="#333632" radius={0.012} />
    <LabBox size={[2.61, 0.045, 0.53]} at={[0, 0.83, 0]} wood radius={0.012} />
    {[-0.95, -0.317, 0.317, 0.95].map(x => <LabBox key={x} size={[0.625, 0.735, 0.025]} at={[x, 0.44, 0.253]} color="#454542" radius={0.006} />)}
    <LabBox size={[2.35, 0.07, 0.38]} at={[0, 0.035, 0]} color="#313330" />
    <LabPlant at={[-1, 0.855, booksOnly ? 0 : 0.16]} scale={booksOnly ? 0.42 : 0.55} trailing={!booksOnly} />
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
      {level === 3 ? null : level === 2 ? <>
        <LabBox size={[0.4, 0.38, 0.34]} at={[-0.23, y + 0.21, 0]} color="#474a43" />
        <LabBox size={[0.12, 0.03, 0.006]} at={[-0.23, y + 0.22, 0.173]} color="#d2cdbf" />
        <LabPlant at={[0.2, y + 0.018, 0.1]} scale={0.45} trailing />
      </> : level === 0 ? <>
        <LabBox size={[0.43, 0.4, 0.34]} at={[0.17, y + 0.22, 0]} color="#b2afa5" />
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
  const cable = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.07, 0.28, -0.045), new THREE.Vector3(-0.12, 0.19, -0.075),
    new THREE.Vector3(-0.1, 0.06, -0.075), new THREE.Vector3(-0.02, 0.006, -0.11),
  ]), []);
  return <group position={[x, 0.82, -0.19]} rotation={[0, tilt, 0]}>
    <mesh position={[-0.09, 0.006, -0.065]} castShadow receiveShadow><cylinderGeometry args={[0.065, 0.075, 0.012, 24]} /><meshStandardMaterial color="#363935" metalness={0.3} roughness={0.5} /></mesh>
    <mesh position={[-0.09, 0.163, -0.065]} castShadow><cylinderGeometry args={[0.014, 0.014, 0.314, 16]} /><meshStandardMaterial color="#555951" metalness={0.45} roughness={0.4} /></mesh>
    <LabBox size={[0.12, 0.026, 0.035]} at={[-0.04, 0.28, -0.065]} metal />
    <LabBox size={[0.045, 0.085, 0.065]} at={[0, 0.305, -0.04]} metal radius={0.009} />
    <LabBox size={[0.13, 0.13, 0.015]} at={[0, 0.33, -0.022]} color="#41453f" />
    <LabBox size={[0.56, 0.35, 0.028]} at={[0, 0.33, 0]} color="#292c2b" />
    {[-0.19, 0.19].map(side => [0, 1, 2].map(row => <LabBox key={`${side}:${row}`} size={[0.07, 0.004, 0.002]} at={[side, 0.23 + row * 0.012, -0.015]} color="#171b19" radius={0.0005} />))}
    <mesh castShadow><tubeGeometry args={[cable, 12, 0.003, 5, false]} /><meshStandardMaterial color="#272c27" roughness={0.9} /></mesh>
    <LabBox size={[0.523, 0.313, 0.004]} at={[0, 0.33, 0.018]} color="#38413f" />
    {[0, 1, 2, 3, 4, 5].map(i => <LabBox key={i} size={[0.12 + i % 3 * 0.06, 0.007, 0.001]} at={[-0.08 + i % 2 * 0.03, 0.43 - i * 0.032, 0.022]} color={i % 3 === 0 ? "#98a48b" : "#687a76"} radius={0.0003} />)}
  </group>;
}

/** A shallow shell about 0.50 m wide with its bevel (0.47 m before), 0.48 m tall; centre line at z = -0.22. */
function createChairBackGeometry() {
  const halfAngle = 0.52, outer = 0.47, inner = 0.43, centre = 0.25, steps = 12;
  const shape = new THREE.Shape();
  for (let i = 0; i <= steps; i++) {
    const angle = -halfAngle + (i / steps) * halfAngle * 2;
    const point: [number, number] = [outer * Math.sin(angle), outer * Math.cos(angle) - centre];
    if (i === 0) shape.moveTo(...point); else shape.lineTo(...point);
  }
  for (let i = steps; i >= 0; i--) {
    const angle = -halfAngle + (i / steps) * halfAngle * 2;
    shape.lineTo(inner * Math.sin(angle), inner * Math.cos(angle) - centre);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.456, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 1 });
  // Extrude upward: shape y becomes -z, so the shell centre lands at z = -0.22.
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -0.228, 0);
  return geometry;
}

function Chair({ at = [0.64, 0, 0.74], upholstery }: { at?: Vec3; upholstery?: string }) {
  const back = useMemo(() => createChairBackGeometry(), []);
  useEffect(() => () => back.dispose(), [back]);
  return <group position={at} rotation={[0, Math.PI, 0]}>
    <LabBox size={[0.49, 0.07, 0.45]} at={[0, 0.48, 0]} color={upholstery ?? "#484a44"} radius={0.035} />
    <mesh geometry={back} position={[0, 0.78, 0]} rotation={[-0.09, 0, 0]} castShadow receiveShadow><meshStandardMaterial color={upholstery ?? "#4b4c47"} roughness={0.86} /></mesh>
    <mesh position={[0, 0.255, 0]} castShadow><cylinderGeometry args={[0.03, 0.04, 0.43, 16]} /><meshStandardMaterial color="#454742" metalness={0.35} roughness={0.55} /></mesh>
    {Array.from({ length: 5 }, (_, i) => <group key={i} rotation={[0, i * Math.PI * 0.4, 0]}><LabBox size={[0.04, 0.03, 0.3]} at={[0, 0.07, 0.12]} /><mesh position={[0, 0.045, 0.28]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.037, 0.037, 0.04, 12]} /><meshStandardMaterial color="#333631" /></mesh></group>)}
    {[-0.27, 0.27].map(x => <group key={x}><LabBox size={[0.028, 0.21, 0.03]} at={[x, 0.54, 0]} /><LabBox size={[0.06, 0.025, 0.3]} at={[x, 0.655, 0]} radius={0.01} /></group>)}
  </group>;
}

function DrawerPedestal() {
  return <group position={[-0.61, 0, -0.06]}>
    <LabBox size={[0.43, 0.6, 0.56]} at={[0, 0.36, 0]} color="#353933" metal radius={0.012} />
    {[[0.24, 0.25], [0.45, 0.15], [0.59, 0.11]].map(([y, height]) => <group key={y}>
      <LabBox size={[0.408, height, 0.024]} at={[0, y, -0.292]} color="#484b44" metal radius={0.004} />
      <LabBox size={[0.16, 0.014, 0.004]} at={[0, y + height / 2 - 0.027, -0.306]} color="#272c27" radius={0.002} />
      <LabBox size={[0.145, 0.004, 0.008]} at={[0, y + height / 2 - 0.021, -0.31]} color="#62665d" metal radius={0.001} />
    </group>)}
    {[-0.16, 0.16].map(x => [-0.2, 0.2].map(z => <mesh key={`${x}:${z}`} position={[x, 0.03, z]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.03, 0.03, 0.025, 12]} /><meshStandardMaterial color="#30342e" /></mesh>))}
  </group>;
}

function DeskTower() {
  return <group position={[-0.25, 0, -0.15]}>
    <LabBox size={[0.24, 0.49, 0.42]} at={[0, 0.275, 0]} color="#30362f" radius={0.008} />
    <LabBox size={[0.214, 0.455, 0.012]} at={[0, 0.275, -0.214]} color="#3b4239" radius={0.004} />
    {Array.from({ length: 7 }, (_, i) => <LabBox key={i} size={[0.145, 0.005, 0.003]} at={[0, 0.12 + i * 0.023, -0.222]} color="#1f251f" radius={0.001} />)}
    <mesh position={[0.065, 0.45, -0.223]} rotation={[0, Math.PI, 0]}><circleGeometry args={[0.008, 12]} /><meshStandardMaterial color="#99a492" /></mesh>
    {[-0.075, 0.075].map(x => <LabBox key={x} size={[0.035, 0.03, 0.32]} at={[x, 0.015, 0]} color="#242a24" />)}
  </group>;
}

function DeskNotebook({ at }: { at: Vec3 }) {
  return <group position={at} rotation={[0, -0.12, 0]}>
    <LabBox size={[0.23, 0.005, 0.29]} at={[0, 0.0025, 0]} color="#66685b" radius={0.003} />
    <LabBox size={[0.214, 0.015, 0.275]} at={[0.004, 0.0125, 0]} color="#e8e1d2" radius={0.002} />
    <LabBox size={[0.23, 0.005, 0.29]} at={[0, 0.0225, 0]} color="#66685b" radius={0.003} />
    <LabBox size={[0.007, 0.025, 0.29]} at={[-0.112, 0.0125, 0]} color="#4b5046" radius={0.002} />
    <LabBox size={[0.012, 0.002, 0.05]} at={[0.06, 0.007, 0.151]} color="#b0a37b" radius={0.001} />
  </group>;
}

function DeskCup({ at }: { at: Vec3 }) {
  return <group position={at}>
    <mesh position={[0, 0.073, 0]} castShadow receiveShadow><cylinderGeometry args={[0.044, 0.035, 0.146, 24]} /><meshStandardMaterial color="#73766a" roughness={0.6} /></mesh>
    <mesh position={[0, 0.145, 0]} castShadow><cylinderGeometry args={[0.047, 0.047, 0.012, 24]} /><meshStandardMaterial color="#303830" roughness={0.65} /></mesh>
    <mesh position={[0, 0.153, 0]}><cylinderGeometry args={[0.039, 0.042, 0.006, 24]} /><meshStandardMaterial color="#454e42" roughness={0.65} /></mesh>
  </group>;
}

function DeskMouse() {
  return <group position={[0.88, 0.82, 0.23]}>
    <LabBox size={[0.064, 0.014, 0.095]} at={[0, 0.007, 0]} color="#484f45" radius={0.012} />
    <mesh position={[0, 0.012, 0]} scale={[0.032, 0.018, 0.047]} castShadow><sphereGeometry args={[1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#969b8e" roughness={0.7} /></mesh>
    <mesh position={[0, 0.028, -0.01]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.004, 0.004, 0.01, 12]} /><meshStandardMaterial color="#3b4439" /></mesh>
  </group>;
}

function Workstation({ shared = false, occupied = false }: { shared?: boolean; occupied?: boolean }) {
  const fabric = useMemo(() => fabricSurface(), []);
  useEffect(() => () => fabric.dispose(), [fabric]);
  return <group>
    <LabBox size={[1.96, 0.055, shared ? 1.5 : 0.94]} at={[0, 0.79, shared ? -0.28 : 0]} wood radius={0.012} />
    {[-0.91, 0.91].map(x => <group key={x}>
      {[shared ? -0.95 : -0.39, 0.39].map(z => <LabBox key={z} size={[0.045, 0.76, 0.045]} at={[x, 0.38, z]} metal />)}
      <LabBox size={[0.045, 0.04, shared ? 1.38 : 0.82]} at={[x, 0.035, shared ? -0.28 : 0]} metal />
      <LabBox size={[0.045, 0.04, shared ? 1.38 : 0.82]} at={[x, 0.742, shared ? -0.28 : 0]} metal />
    </group>)}
    <LabBox size={[1.8, 0.065, 0.035]} at={[0, 0.7, -0.38]} />
    <DrawerPedestal /><DeskTower />
    <RoundedBox args={[shared ? 1.34 : 0.98, 0.39, 0.043]} position={[shared ? -0.25 : -0.43, 1.03, -0.33]} radius={0.012} smoothness={2} castShadow receiveShadow><meshStandardMaterial map={fabric} bumpMap={fabric} bumpScale={0.3} roughness={1} /></RoundedBox>
    {(!shared || occupied) && <><Monitor x={-0.25} tilt={0.08} /><Monitor x={0.36} tilt={-0.12} /></>}
    {shared && <group position={[0, 0, -0.64]} rotation={[0, Math.PI, 0]}>
      <Monitor x={0.1} tilt={-0.1} />
      <LabBox size={[0.47, 0.019, 0.16]} at={[0.1, 0.831, 0.13]} color="#303630" />
      {Array.from({ length: 4 }, (_, row) => Array.from({ length: 13 }, (_, col) => <LabBox key={`${row}:${col}`} size={[0.026, 0.004, 0.024]} at={[-0.107 + col * 0.034, 0.843, 0.075 + row * 0.034]} color="#7c8176" radius={0.001} />))}
      <LabBox size={[0.24, 0.024, 0.28]} at={[-0.55, 0.835, 0.08]} color="#748064" />
      <LabBox size={[0.21, 0.012, 0.255]} at={[-0.55, 0.837, 0.085]} color="#e8e1d2" />
      <LabPlant at={[0.78, 0.82, 0]} scale={0.35} />
    </group>}
    {(!shared || occupied) && <>
      <LabBox size={[0.47, 0.019, 0.16]} at={[0.6, 0.831, 0.32]} color="#303630" />
      {Array.from({ length: 4 }, (_, row) => Array.from({ length: 13 }, (_, col) => <LabBox key={`${row}:${col}`} size={[0.026, 0.004, 0.024]} at={[0.393 + col * 0.034, 0.843, 0.265 + row * 0.034]} color="#7c8176" radius={0.001} />))}
      <DeskMouse />
    </>}
    <DeskNotebook at={shared ? [0.75, 0.82, 0] : [0.72, 0.82, -0.18]} />
    <LabPlant at={shared ? [-0.79, 0.82, -0.22] : [-0.65, 0.82, -0.415]} scale={0.32} squarePot={!shared} />
    {shared && <group position={[-0.63, 0.82, 0.24]}>
      <LabBox size={[0.42, 0.018, 0.23]} at={[0, 0.009, 0]} color="#41473d" />
      {[-0.203, 0.203].map(x => <LabBox key={x} size={[0.014, 0.14, 0.23]} at={[x, 0.075, 0]} color="#41473d" />)}
      {[-0.108, 0.108].map(z => <LabBox key={z} size={[0.42, 0.1, 0.014]} at={[0, 0.055, z]} color="#41473d" />)}
      {[0, 1, 2].map(i => <Book key={i} at={[-0.135 + i * 0.075, 0.018, 0]} width={0.06} height={0.23 + i % 2 * 0.035} color={["#ece4cf", "#7e886c", "#b9ae8c"][i]} />)}
    </group>}
    <DeskCup at={shared ? [-0.07, 0.82, 0.29] : [0.36, 0.82, -0.37]} />
    <Chair />
    {shared && <Chair at={[-0.45, 0, 0.74]} upholstery="#8a917b" />}
  </group>;
}

function PrivacyDivider() {
  const fabric = useMemo(() => fabricSurface("#c3c0b7"), []);
  useEffect(() => () => fabric.dispose(), [fabric]);
  return <group>
    <RoundedBox args={[1.45, 1.25, 0.065]} position={[0, 0.86, 0]} radius={0.025} smoothness={3} castShadow receiveShadow><meshStandardMaterial map={fabric} bumpMap={fabric} bumpScale={0.3} roughness={1} /></RoundedBox>
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

export function ResearchFurniture({ type, booksOnly = false, sharedDesk = false, occupied = false }: { type: ResearchFurnitureType; booksOnly?: boolean; sharedDesk?: boolean; occupied?: boolean }) {
  if (type === "workstation") return <Workstation shared={sharedDesk} occupied={occupied} />;
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
        // Keep the scanned tile variation subtle, on the warm grey of the approved floor.
        shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>\ndiffuseColor.rgb = mix(vec3(0.42, 0.37, 0.33), diffuseColor.rgb, 0.5);");
      }} /></mesh>
    {/* Two internal glazed doors frame the room, as in the approved view. */}
    <LabBox size={[0.1, 3.6, 4.65]} at={[-3.54, 1.8, -0.525]} color="#efe2cc" />
    <LabBox size={[0.1, 3.6, 4.95]} at={[-3.54, 1.8, 5.675]} color="#efe2cc" />
    <LabBox size={[0.1, 0.4, 1.4]} at={[-3.54, 3.4, 2.5]} color="#efe2cc" />
    <LabBox size={[3.63, 3.6, 0.1]} at={[-1.735, 1.8, -2.3]} color="#efe5d5" />
    <LabBox size={[0.025, 0.09, 4.65]} at={[-3.48, 0.045, -0.525]} color="#737568" />
    <LabBox size={[0.025, 0.09, 4.95]} at={[-3.48, 0.045, 5.675]} color="#737568" />
    <LabBox size={[3.58, 0.09, 0.025]} at={[-1.72, 0.045, -2.24]} color="#737568" />
    <group position={[-3.47, 1.65, 0.4]} rotation={[0, Math.PI / 2, 0]}>
      <Text font="/office-assets/fonts/Roboto-Bold.ttf" characters="REVELARE" fontSize={0.27} fontWeight={700} color="#30342e" letterSpacing={0.025}>REVELARE</Text>
      <Text font="/office-assets/fonts/Roboto-Regular.ttf" characters="SECURITY LABS" position={[0, -0.245, 0]} fontSize={0.105} color="#41463a" letterSpacing={0.12}>SECURITY LABS</Text>
      <LabBox size={[1.43, 0.055, 0.1]} at={[0, 0.3, 0.045]} color="#87966d" />
      <mesh position={[0, 0.275, 0.07]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[1.25, 0.07]} /><meshBasicMaterial color="#f8e5ab" /></mesh>
    </group>
    <Noticeboard />
    <GlazedDoorway at={[0.75, 0, -2.28]} />
    <GlazedDoorway at={[-3.52, 0, 2.5]} rotation={Math.PI / 2} />
  </group>;
}
