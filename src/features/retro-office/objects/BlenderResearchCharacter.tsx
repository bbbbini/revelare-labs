import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { AgentAvatarProfile } from "@/lib/avatars/profile";

/** Authored GLB with explicit limb pivots; animations follow real runtime status. */
export function BlenderResearchCharacter({ profile, working }: { profile: AgentAvatarProfile; working: boolean }) {
  const { scene } = useGLTF("/office-assets/models/research/researcher-b.glb");
  const model = useMemo(() => {
    const copy = scene.clone(true);
    const palette: Record<string, string> = {
      Skin: profile.body.skinTone, Hair: profile.hair.color, Top: profile.clothing.topColor,
      Bottom: profile.clothing.bottomColor, Shoes: profile.clothing.shoesColor,
    };
    copy.traverse(node => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      const tint = (material: THREE.Material) => {
        const next = material.clone() as THREE.MeshStandardMaterial;
        if (palette[material.name]) next.color.set(palette[material.name]);
        return next;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(tint) : tint(mesh.material);
      mesh.castShadow = mesh.receiveShadow = true;
    });
    return copy;
  }, [scene, profile]);
  useEffect(() => () => model.traverse(node => {
    const mesh = node as THREE.Mesh;
    if (mesh.isMesh) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => material.dispose());
  }), [model]);
  const joints = useRef<(THREE.Object3D | undefined)[]>([]);
  useEffect(() => {
    joints.current = ["ArmL", "ArmR", "LegL", "LegR", "KneeL", "KneeR"].map(name => model.getObjectByName(name));
  }, [model]);
  useFrame(({ clock }) => {
    const phase = clock.elapsedTime;
    const bones = joints.current;
    for (let i = 0; i < 2; i++) if (bones[i]) bones[i]!.rotation.x = working ? -1.08 + Math.sin(phase * 6 + i * 2) * 0.026 : -0.55;
    for (let i = 2; i < 4; i++) if (bones[i]) bones[i]!.rotation.x = -1.32;
    for (let i = 4; i < 6; i++) if (bones[i]) bones[i]!.rotation.x = 1.32;
  });
  return <primitive object={model} dispose={null} />;
}
