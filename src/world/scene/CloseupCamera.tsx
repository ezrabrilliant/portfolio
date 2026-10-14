import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CLOSEUP_HUD_PX, clampPan, closeupNear, closeupPanLimit, closeupPose } from "@/world/engine/camera/closeup";
import type { Vec3 } from "@/world/engine/types";
import { runtime } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { closeupBlend, stepBlendClock } from "./camera/closeupBlend";
import type { BlendClock } from "./camera/closeupBlend";
import { closeupPan } from "./closeupState";

/** The HUD never takes more than this share of the frame (a very short window keeps a usable closeup). */
const MAX_INSET = 0.3;

/**
 * The closeup camera layer (spec §6). Mounted after TourCamera and PlayCamera, it blends the pose they set this frame
 * toward the open target's closeup pose (re-evaluated every frame, so a moving target stays framed) with an eased
 * weight in and out; reduced motion cuts. The pose leaves the HUD's band at the top free, a wide target on a portrait
 * viewport is fitted by its height and panned (closeupPan), and the near plane moves up to just in front of the face so
 * nothing between the camera and the screen (a prop, Ezra) covers it. At weight 0 the camera is the base cameras' again,
 * with its default near plane. A Play fast travel's arrival cuts the blend (closeupBlend.travelCutsCloseup): the glide
 * out from the departure map board must not pull the camera back toward it. The weight is published in closeupBlend
 * for frame code mounted after this one (Ezra hides past half way).
 */
export function CloseupCamera() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const st = useMemo(
    () => ({
      /** the blend clock and the target it frames (stepBlendClock) */
      clock: { k: 0, id: null } as BlendClock,
      pose: { camera: { x: 0, y: 0, z: 0 } as Vec3, target: { x: 0, y: 0, z: 0 } as Vec3 },
      eye: new THREE.Vector3(),
      look: new THREE.Vector3(),
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      /** the camera's own near plane, restored when the closeup has glided out */
      baseNear: camera.near,
    }),
    [camera],
  );

  const setNear = (near: number) => {
    if (Math.abs(camera.near - near) < 1e-4) return;
    camera.near = near;
    camera.updateProjectionMatrix();
  };

  // a remounted camera starts unblended: nothing reads a weight left over from the last one
  useEffect(
    () => () => {
      closeupBlend.weight = 0;
    },
    [],
  );

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const reduced = useWorld.getState().reducedMotion;
    const w = stepBlendClock(st.clock, runtime.closeup, runtime.closeups, runtime.travel, dt, reduced);
    closeupBlend.weight = w;
    const target = st.clock.id !== null ? runtime.closeups.get(st.clock.id) : undefined;
    if (w <= 0 || !target) {
      // nothing open, the glide out has landed, the target unmounted, or a fast travel arrived: the base camera is the
      // camera, with its own near plane
      setNear(st.baseNear);
      return;
    }
    // the HUD covers the canvas's top CLOSEUP_HUD_PX: the target is fitted and centred in the frame below it
    const inset = Math.min(MAX_INSET, CLOSEUP_HUD_PX / Math.max(1, state.size.height));
    closeupPan.limit = closeupPanLimit(target.size, camera.aspect, camera.fov, inset);
    closeupPan.offset = clampPan(closeupPan.offset, closeupPan.limit);
    const center = target.center();
    const normal = target.normal();
    const pose = closeupPose(center, normal, target.size, camera.aspect, camera.fov, st.pose, { inset, pan: closeupPan.offset });
    // CSS px of drag → world units on the face (CloseupController's pan)
    const dist = Math.hypot(pose.camera.x - pose.target.x, pose.camera.y - pose.target.y, pose.camera.z - pose.target.z);
    closeupPan.perPx = (2 * dist * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(1, state.size.height);
    st.eye.set(pose.camera.x, pose.camera.y, pose.camera.z);
    st.look.set(pose.target.x, pose.target.y, pose.target.z);
    // a camera looks down its −z: Matrix4.lookAt(eye, target, up) is the rotation Object3D.lookAt gives a camera
    st.m.lookAt(st.eye, st.look, camera.up);
    st.q.setFromRotationMatrix(st.m);
    camera.position.lerp(st.eye, w);
    camera.quaternion.slerp(st.q, w);
    // clip whatever stands between the camera and the face: the near plane just in front of the face's plane
    const nl = Math.hypot(normal.x, normal.y, normal.z) || 1;
    const face =
      ((camera.position.x - center.x) * normal.x + (camera.position.y - center.y) * normal.y + (camera.position.z - center.z) * normal.z) / nl;
    setNear(closeupNear(st.baseNear, face, w));
    runtime.cameraPos.x = camera.position.x;
    runtime.cameraPos.y = camera.position.y;
    runtime.cameraPos.z = camera.position.z;
  });
  return null;
}
