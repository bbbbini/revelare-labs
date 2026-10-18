"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Billboard, ContactShadows, Html, OrbitControls } from "@react-three/drei";
import { EffectComposer, N8AO } from "@react-three/postprocessing";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Home, Settings, CircleHelp, Menu, PanelsTopLeft, Users, Move, RotateCcw, RotateCw, Trash2, Plus, Save, X, Camera } from "lucide-react";
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import type { OfficeAgent } from "./core/types";
import { BlenderResearchCharacter } from "./objects/BlenderResearchCharacter";
import { SavedResearchAvatar } from "./objects/SavedResearchAvatar";
import { supportsResearchCharacter } from "./core/researchAvatar";
import { createAgentAvatarProfileFromSeed } from "@/lib/avatars/profile";
import { AGENT_STATUS_LABELS } from "@/features/office/statusLabels";
import { ResearchArchitecture, ResearchFurniture, ResearchMaterials } from "./scene/ResearchRoom";
import { SceneErrorBoundary } from "./systems/SceneErrorBoundary";
import { defaultResearchLayout, moveResearchItem, parseResearchLayout, RESEARCH_FURNITURE, researchLayoutKey, serializeResearchLayout, type ResearchFurnitureType, type ResearchLayoutItem } from "./core/researchLayout";

const CAMERA: [number, number, number] = [4.6, 4.75, 5.5];
const TARGET: [number, number, number] = [-0.75, 0.6, 0.45];
const FLOOR = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
// Reuse Three's shared lookup textures across room mounts and hot reloads.
if (!Object.hasOwn(THREE.UniformsLib, "LTC_FLOAT_1")) RectAreaLightUniformsLib.init();

function RendererStatus({ onInterrupted }: { onInterrupted: (value: boolean) => void }) {
  const gl = useThree(state => state.gl);
  const setFrameloop = useThree(state => state.setFrameloop);
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => { event.preventDefault(); setFrameloop("never"); onInterrupted(true); };
    const restored = () => { setFrameloop("always"); onInterrupted(false); };
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    return () => {
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
    };
  }, [gl, onInterrupted, setFrameloop]);
  return null;
}

function Researcher({ agent, onSelect }: { agent: OfficeAgent; onSelect?: (id: string) => void }) {
  const profile = agent.avatarProfile ?? createAgentAvatarProfileFromSeed(agent.id);
  return <group position={[0.64, 0.02, 0.72]} rotation={[0, Math.PI, 0]}>
    {supportsResearchCharacter(profile) ? <group scale={1.65} onClick={event => { event.stopPropagation(); onSelect?.(agent.id); }}>
      <BlenderResearchCharacter profile={profile} working={agent.status === "working"} />
    </group> : <SavedResearchAvatar agent={agent} onSelect={onSelect} />}
    <Billboard position={[0, 1.48, 0]}>
      <Html center zIndexRange={[15, 0]}>
        <button className="research-nameplate" onPointerDown={e => e.stopPropagation()} onClick={() => onSelect?.(agent.id)} aria-label={`${agent.name} 대화 열기`}>
          <i data-status={agent.status} /><span>{agent.name}<small>{AGENT_STATUS_LABELS[agent.status]}</small></span>
        </button>
      </Html>
    </Billboard>
  </group>;
}

function PlacedFurniture({ item, agent, editing, selected, onSelect, onMove, onAgentSelect }: {
  item: ResearchLayoutItem; agent?: OfficeAgent; editing: boolean; selected: boolean;
  onSelect: (id: string) => void; onMove: (id: string, x: number, z: number) => void; onAgentSelect?: (id: string) => void;
}) {
  const drag = useRef<{ pointer: number; dx: number; dz: number } | null>(null);
  const down = (event: ThreeEvent<PointerEvent>) => {
    if (!editing) return;
    event.stopPropagation(); onSelect(item.id);
    const point = event.ray.intersectPlane(FLOOR, new THREE.Vector3());
    if (!point) return;
    drag.current = { pointer: event.pointerId, dx: item.x - point.x, dz: item.z - point.z };
    (event.target as HTMLElement | null)?.setPointerCapture(event.pointerId);
  };
  const move = (event: ThreeEvent<PointerEvent>) => {
    if (!editing || !drag.current) return;
    event.stopPropagation();
    const point = event.ray.intersectPlane(FLOOR, new THREE.Vector3());
    if (point) onMove(item.id, point.x + drag.current.dx, point.z + drag.current.dz);
  };
  const up = (event: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return;
    event.stopPropagation();
    (event.target as HTMLElement | null)?.releasePointerCapture(drag.current.pointer); drag.current = null;
  };
  return <group position={[item.x, 0, item.z]} rotation={[0, item.rotation, 0]} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
    onClick={event => { event.stopPropagation(); if (editing) onSelect(item.id); else if (agent) onAgentSelect?.(agent.id); }}>
    <ResearchFurniture type={item.type} booksOnly={item.id === "back-cabinet"} sharedDesk={item.id === "foreground-desk"} occupied={!!agent} />
    {!editing && agent && <Researcher agent={agent} onSelect={onAgentSelect} />}
    {selected && editing && <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.05, 1.08, 48]} /><meshBasicMaterial color="#5b865e" transparent opacity={0.8} depthWrite={false} /></mesh>}
  </group>;
}

const WALL_WASH = 3;

/** Soft warm light grazing an ivory wall from the ceiling line, as in the approved view. */
function WallWash({ position, target, width, height, intensity }: { position: [number, number, number]; target: [number, number, number]; width: number; height: number; intensity: number }) {
  const light = useRef<THREE.RectAreaLight>(null);
  const [px, py, pz] = position;
  const [x, y, z] = target;
  useLayoutEffect(() => { light.current?.lookAt(x, y, z); }, [px, py, pz, x, y, z]);
  return <rectAreaLight ref={light} position={position} width={width} height={height} intensity={intensity} color="#fff0dc" />;
}

function CameraControls({ editing, revision }: { editing: boolean; revision: number }) {
  const controls = useRef<OrbitControlsImpl>(null);
  useEffect(() => {
    if (!controls.current) return;
    controls.current.object.position.set(...CAMERA);
    controls.current.target.set(...TARGET);
    controls.current.update();
  }, [revision]);
  return <OrbitControls ref={controls} makeDefault target={TARGET} enabled={!editing} minDistance={3} maxDistance={16} maxPolarAngle={Math.PI / 2.12} enableDamping dampingFactor={0.12} />;
}

export function ResearchLabScene({ agents, chatOpen, gatewayStatus, officeTitle, storageNamespace = "default", readOnly = false, onSelect, onLegacy, onSettings, onHelp }: {
  agents: OfficeAgent[]; chatOpen: boolean; gatewayStatus: string; officeTitle: string; storageNamespace?: string; readOnly?: boolean;
  onSelect?: (id: string) => void; onLegacy: () => void; onSettings: () => void; onHelp?: () => void;
}) {
  const [items, setItems] = useState<ResearchLayoutItem[]>(() => {
    try { return parseResearchLayout(localStorage.getItem(researchLayoutKey(storageNamespace))) ?? defaultResearchLayout(); }
    catch { return defaultResearchLayout(); }
  });
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [cameraRevision, setCameraRevision] = useState(0);
  const [rendererRevision, setRendererRevision] = useState(0);
  const [rendererInterrupted, setRendererInterrupted] = useState(false);
  const [message, setMessage] = useState("");
  const [addType, setAddType] = useState<ResearchFurnitureType>("workstation");
  const saved = useRef(items);
  const current = items.find(item => item.id === selected);
  const move = useCallback((id: string, x: number, z: number) => setItems(prev => moveResearchItem(prev, id, x, z)), []);
  const rotate = () => setItems(prev => prev.map(item => item.id === selected ? { ...item, rotation: item.rotation + Math.PI / 2 } : item));
  const cancel = () => { setItems(saved.current); setEditing(false); setSelected(null); setMessage(""); };
  const save = () => {
    try {
      localStorage.setItem(researchLayoutKey(storageNamespace), serializeResearchLayout(items));
      saved.current = items; setEditing(false); setSelected(null); setMessage("이 브라우저에 연구실 배치를 저장했습니다.");
    } catch { setMessage("배치를 저장하지 못했습니다. 저장 공간을 확인한 뒤 다시 시도하세요."); }
  };
  const desks = items.filter(item => item.type === "workstation");
  return <div className="research-office relative h-full w-full overflow-hidden bg-[#d4cfc4] text-[#30372e]" data-testid="research-office">
    <header className="research-app-header"><button aria-label="기존 사무실 배치 열기" title="기존 사무실 배치 열기" onClick={onLegacy}><Menu size={20} /></button><span className="research-brand">REVELARE <span>SECURITY LABS</span></span><span className="research-connection"><i className={gatewayStatus === "connected" ? "is-connected" : ""} />{gatewayStatus === "connected" ? "연결됨" : "연결 대기"}</span><span className="research-agent-count"><Users size={14} className="inline mr-2" />{agents.length} 에이전트</span></header>
    <div className={`research-viewport ${chatOpen ? "with-chat" : ""}`}>
      <SceneErrorBoundary>
      <Canvas key={rendererRevision} shadows={{ type: THREE.VSMShadowMap }} dpr={[1, 1.5]} camera={{ position: CAMERA, fov: 28, near: 0.1, far: 60 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.25 }}>
        <RendererStatus onInterrupted={setRendererInterrupted} />
        <color attach="background" args={["#e3dacb"]} />
        <hemisphereLight args={["#f4f1eb", "#b9bab6", 0.85]} />
        <directionalLight position={[-3, 7, 4]} intensity={2.5} color="#fff0d9" castShadow shadow-mapSize={[512, 512]} shadow-radius={4} shadow-blurSamples={8} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} shadow-camera-near={1} shadow-camera-far={20} shadow-normalBias={0.025} shadow-bias={-0.0002} />
        <directionalLight position={[5, 3, -1]} intensity={0.35} color="#f0f2eb" />
        <rectAreaLight position={[0, 3.3, 2]} rotation={[-0.85, 0.35, 0]} width={4} height={2.5} intensity={2.8} color="#fff0db" />
        <pointLight position={[-3.1, 2, 0.4]} intensity={0.18} distance={2.6} decay={2} color="#fff4e5" />
        <WallWash position={[-1.7, 3.15, -1.15]} target={[-1.7, 1.7, -2.25]} width={3.4} height={1.1} intensity={WALL_WASH * 0.55} />
        <WallWash position={[-2.35, 3.15, 0.2]} target={[-3.49, 1.7, 0.2]} width={4.2} height={1.1} intensity={WALL_WASH} />
        <Suspense fallback={<Html center><p className="research-loading" role="status">연구실을 불러오는 중…</p></Html>}>
          <ResearchMaterials>
            <ResearchArchitecture />
            {!editing && <ContactShadows key={serializeResearchLayout(items)} position={[0, 0.005, 0]} opacity={0.55} scale={16} blur={2} far={3} resolution={512} frames={1} />}
            {items.map(item => <PlacedFurniture key={item.id} item={item} agent={item.type === "workstation" ? agents[desks.findIndex(desk => desk.id === item.id)] : undefined} editing={editing} selected={selected === item.id} onSelect={setSelected} onMove={move} onAgentSelect={onSelect} />)}
            {/* Additional agents stay selectable even when there are fewer authored desks. */}
            {agents.slice(desks.length).map((agent, index) => <group key={agent.id} position={[1.2 + index * 0.7, 0, -1.2]}><Researcher agent={agent} onSelect={onSelect} /></group>)}
          </ResearchMaterials>
        </Suspense>
        <CameraControls editing={editing} revision={cameraRevision} />
        {!rendererInterrupted && <EffectComposer multisampling={0}><N8AO halfRes quality="medium" aoRadius={0.35} intensity={2.1} /></EffectComposer>}
      </Canvas>
      </SceneErrorBoundary>
      {rendererInterrupted && <div className="research-renderer-recovery" role="alert">
        <p>3D 화면이 일시 중단되었습니다.</p>
        <button onClick={() => { setRendererInterrupted(false); setRendererRevision(value => value + 1); }}>3D 화면 다시 열기</button>
      </div>}
      <div className="research-view-controls">
        <button onClick={() => setCameraRevision(value => value + 1)} title="시안 기본 시점 복원"><Camera size={16} />기본 시점</button>
        {!readOnly && !editing && <button onClick={() => { saved.current = items; setEditing(true); setMessage(""); }}><Move size={16} />배치 편집</button>}
      </div>
      {editing && <section className="research-layout-editor" aria-label="연구실 배치 편집">
        <strong>연구실 배치</strong><p>가구를 끌어 이동하거나 선택한 가구를 90°씩 회전하세요.</p>
        <label>선택 가구<select aria-label="선택 가구" value={selected ?? ""} onChange={e => setSelected(e.target.value || null)}><option value="">가구 선택</option>{items.map((item, index) => <option key={item.id} value={item.id}>{RESEARCH_FURNITURE[item.type]} {index + 1}</option>)}</select></label>
        {current && <>
          <div className="research-layout-row"><label>X<input aria-label="가구 X 위치" type="number" step="0.1" min="-3.4" max="5" value={current.x} onChange={e => { if (Number.isFinite(e.target.valueAsNumber)) move(current.id, e.target.valueAsNumber, current.z); }} /></label><label>Z<input aria-label="가구 Z 위치" type="number" step="0.1" min="-3.4" max="5" value={current.z} onChange={e => { if (Number.isFinite(e.target.valueAsNumber)) move(current.id, current.x, e.target.valueAsNumber); }} /></label></div>
          <div className="research-layout-row"><button onClick={rotate}><RotateCw size={15} />90° 회전</button><button onClick={() => { setItems(prev => prev.filter(item => item.id !== selected)); setSelected(null); }}><Trash2 size={15} />삭제</button></div>
        </>}
        <div className="research-layout-row"><select aria-label="추가할 가구" value={addType} onChange={e => setAddType(e.target.value as ResearchFurnitureType)}>{Object.entries(RESEARCH_FURNITURE).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button disabled={items.length >= 80} onClick={() => { const id = crypto.randomUUID(); setItems(prev => [...prev, { id, type: addType, x: 1, z: 1, rotation: 0 }]); setSelected(id); }}><Plus size={15} />추가</button></div>
        <button onClick={() => { setItems(defaultResearchLayout()); setSelected(null); }}><RotateCcw size={15} />시안 배치로 되돌리기</button>
        <div className="research-layout-row"><button onClick={save}><Save size={15} />배치 저장</button><button onClick={cancel}><X size={15} />취소</button></div>
      </section>}
      {message && <p className="research-layout-message" role="status">{message}</p>}
    </div>
    <nav className="research-app-footer" aria-label="연구실 메뉴"><button className="active" onClick={() => agents[0] && onSelect?.(agents[0].id)}><Home size={18} className="inline mr-2" />사무실</button><button onClick={onSettings}><Settings size={18} className="inline mr-2" />설정</button><button onClick={onHelp}><CircleHelp size={18} className="inline mr-2" />도움말</button><button onClick={onLegacy}><PanelsTopLeft size={16} className="inline mr-2" />기존 배치</button><span>{officeTitle}</span></nav>
  </div>;
}
