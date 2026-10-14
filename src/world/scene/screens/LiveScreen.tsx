import { useEffect, useMemo, useRef } from "react";
import type { JSX } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { playSfx } from "@/world/engine/audio/sfx";
import type { IslandPlacement } from "@/world/engine/gen/layout";
import type { Vec3 } from "@/world/engine/types";
import { runtime } from "@/world/state/runtime";
import type { CloseupTarget } from "@/world/state/runtime";
import { useWorld } from "@/world/state/store";
import { Interactable } from "@/world/scene/Interactable";
import { closeCloseup, openCloseup } from "@/world/scene/closeupState";
import { SCREEN_BEZEL } from "@/world/scene/islands/shared/boardGeometry";
import { loadCanvasFonts } from "@/world/scene/islands/shared/canvasFonts";
import { islandFrame, worldTuple } from "@/world/scene/islands/shared/local";
import { screensVersion } from "./dirty";
import { DEMO_PAUSE, arrivalPause, demoMayRun, inView, redrawDue } from "./policy";
import type { DemoGate } from "./policy";
import { SCREEN_SCALE, hitAt, uvToLogical } from "./types";
import type { HitRegion, ScreenApp } from "./types";

// the master contract names this module; the implementation lives in ./dirty (plain module, see Part B plan)
// eslint-disable-next-line react-refresh/only-export-components
export { markScreensDirty } from "./dirty";

/** Depth of the Interactable's hitbox around the face (axis-aligned: a turned screen gets a wider box). */
const HIT_DEPTH = 0.3;

export interface LiveScreenProps<S> {
  /** Also the Interactable id and the closeup target id. */
  id: string;
  placement: IslandPlacement;
  /** A stable object (module constant or memoised): the program's state is keyed on it. */
  app: ScreenApp<S>;
  /** Interactable label, e.g. "Use the POS". */
  label: string;
  /** Island-local centre of the screen face (islandFrame: y = 0 is the grass top, fronts face +z). */
  at: { x: number; y: number; z: number };
  rotationY?: number;
  /** World units of the visible face. */
  size: { w: number; h: number };
  /** "bezel" (default): a rounded dark frame behind the face. */
  frame?: "bezel" | "none";
  bezelColor?: string;
  /** Interactable reach in Play (blocks from Ezra's chest to the face centre). */
  radius?: number;
}

/**
 * One program screen (spec §5.1): a canvas texture of logical × SCREEN_SCALE pixels, redrawn only when the program's
 * state changed, an image arrived or the program animates (at most 15 fps, only while in view). Its idle demo plays
 * while the island is in view or the screen is in closeup, starts ARRIVAL_READ after the screen comes into view, pauses
 * DEMO_PAUSE after a tap, and is off under reduced motion. Activating it (click, E, Enter) opens the closeup; taps in
 * closeup reach the program via its CloseupTarget.
 */
export function LiveScreen<S>({
  id,
  placement,
  app,
  label,
  at,
  rotationY = 0,
  size,
  frame = "bezel",
  bezelColor = "#22262b",
  radius = 3.5,
}: LiveScreenProps<S>): JSX.Element {
  const face = useRef<THREE.Mesh>(null);
  const width = app.logical.w * SCREEN_SCALE;
  const height = app.logical.h * SCREEN_SCALE;

  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [width, height]);
  useEffect(() => () => texture.dispose(), [texture]);

  const bezel = useMemo(
    () => (frame === "bezel" ? new RoundedBoxGeometry(size.w + 2 * SCREEN_BEZEL.rim, size.h + 2 * SCREEN_BEZEL.rim, SCREEN_BEZEL.depth, 2, 0.05) : null),
    [frame, size.w, size.h],
  );
  useEffect(() => () => bezel?.dispose(), [bezel]);

  // the program's state and the redraw bookkeeping: frame callbacks and taps mutate it, React never re-renders for it
  const st = useMemo(
    () => ({
      app,
      canvas: texture.image as HTMLCanvasElement,
      s: null as S | null,
      regions: [] as HitRegion[],
      t: 0,
      dirty: true,
      wasBusy: false,
      version: -1,
      lastDraw: -Infinity,
      pausedUntil: 0,
      wasInView: false,
      fontsReady: false,
      ctx: null as CanvasRenderingContext2D | null,
      gate: { reduced: false, t: 0, pausedUntil: 0, inCloseup: false, activeIsland: "", island: "" } as DemoGate,
      viewProj: new THREE.Matrix4(),
      frustum: new THREE.Frustum(),
    }),
    [app, texture],
  );

  useEffect(() => {
    let alive = true;
    void loadCanvasFonts().then(() => {
      if (!alive) return;
      st.fontsReady = true;
      st.dirty = true;
    });
    return () => {
      alive = false;
    };
  }, [st]);

  // the closeup target: CloseupCamera frames it, CloseupController sends it rays, taps and keys
  useEffect(() => {
    const v = new THREE.Vector3();
    const centre: Vec3 = { x: 0, y: 0, z: 0 };
    const normal: Vec3 = { x: 0, y: 0, z: 1 };
    const caster = new THREE.Raycaster();
    const from = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const target: CloseupTarget = {
      id,
      island: placement.id,
      size: { w: size.w, h: size.h },
      center: () => {
        if (face.current) {
          face.current.getWorldPosition(v);
          centre.x = v.x;
          centre.y = v.y;
          centre.z = v.z;
        }
        return centre;
      },
      normal: () => {
        if (face.current) {
          face.current.getWorldDirection(v);
          normal.x = v.x;
          normal.y = v.y;
          normal.z = v.z;
        }
        return normal;
      },
      input: (x, y) => {
        if (st.s === null) return;
        // any tap on the face pauses the idle demo, also one between the buttons
        st.pausedUntil = st.t + DEMO_PAUSE;
        const region = hitAt(st.regions, x, y);
        if (!region) return;
        st.s = app.act(st.s, region.action, region.arg, st.t);
        st.dirty = true;
        playSfx("click");
      },
      hit: (origin, direction) => {
        const mesh = face.current;
        if (!mesh) return null;
        caster.set(from.set(origin.x, origin.y, origin.z), dir.set(direction.x, direction.y, direction.z).normalize());
        const uv = caster.intersectObject(mesh, false)[0]?.uv;
        return uv ? uvToLogical(uv, app.logical) : null;
      },
      key: (code) => {
        if (!app.key || st.s === null) return false;
        const next = app.key(st.s, code, st.t);
        if (next === null) return false;
        st.s = next;
        st.dirty = true;
        st.pausedUntil = st.t + DEMO_PAUSE;
        return true;
      },
    };
    runtime.closeups.set(id, target);
    return () => {
      if (runtime.closeups.get(id) === target) runtime.closeups.delete(id);
      if (runtime.closeup?.id === id) closeCloseup();
    };
  }, [id, placement.id, size.w, size.h, app, st]);

  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    st.t = t;
    // ScreenApp contract: init's `now` is the wall time at clock t = 0
    if (st.s === null) st.s = app.init(new Date(Date.now() - t * 1000));
    const world = useWorld.getState();
    const g = st.gate;
    g.reduced = world.reducedMotion;
    g.t = t;
    g.inCloseup = runtime.closeup?.id === id;
    g.activeIsland = world.activeIsland;
    g.island = placement.id;
    // on arrival the visitor reads the screen as it is for ARRIVAL_READ before the demo moves it on
    const nowInView = inView(g);
    st.pausedUntil = arrivalPause(st.wasInView, nowInView, t, st.pausedUntil);
    st.wasInView = nowInView;
    g.pausedUntil = st.pausedUntil;
    if (demoMayRun(g)) {
      const next = app.auto(st.s, t);
      if (next) {
        st.s = next;
        st.dirty = true;
      }
    }
    const version = screensVersion();
    if (version !== st.version) {
      st.version = version;
      st.dirty = true;
    }
    const busy = app.busy(st.s, t);
    // the last busy frame still showed the animation: when it ends, paint the settled frame once (dirty waits for view)
    if (st.wasBusy && !busy) st.dirty = true;
    st.wasBusy = busy;
    if (!st.fontsReady || !redrawDue(t, st.lastDraw, st.dirty, busy)) return;
    const mesh = face.current;
    if (!mesh) return;
    // out of view: keep the redraw pending until the screen comes into view
    st.viewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    st.frustum.setFromProjectionMatrix(st.viewProj);
    if (!st.frustum.intersectsObject(mesh)) return;
    if (!st.ctx) st.ctx = st.canvas.getContext("2d");
    const ctx = st.ctx;
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(SCREEN_SCALE, 0, 0, SCREEN_SCALE, 0, 0);
    st.regions = app.draw(ctx, st.s, t);
    ctx.restore();
    texture.needsUpdate = true;
    st.dirty = false;
    st.lastDraw = t;
  });

  const [wx, wy, wz] = worldTuple(placement, at.x, at.y, at.z);
  const cos = Math.abs(Math.cos(rotationY));
  const sin = Math.abs(Math.sin(rotationY));
  return (
    <>
      <group position={islandFrame(placement)}>
        <group position={[at.x, at.y, at.z]} rotation={[0, rotationY, 0]}>
          {bezel && (
            <mesh geometry={bezel} position={[0, 0, -SCREEN_BEZEL.depth / 2]} castShadow>
              <meshStandardMaterial color={bezelColor} roughness={0.6} />
            </mesh>
          )}
          <mesh ref={face} position={[0, 0, 0.002]}>
            <planeGeometry args={[size.w, size.h]} />
            {/* unlit: the face shows the program's colours as drawn (a lit + emissive face washed light UI colours out to white) */}
            <meshBasicMaterial map={texture} toneMapped={false} />
          </mesh>
        </group>
      </group>
      <Interactable
        id={id}
        island={placement.id}
        label={label}
        position={[wx, wy, wz]}
        size={[cos * size.w + sin * HIT_DEPTH, size.h, sin * size.w + cos * HIT_DEPTH]}
        radius={radius}
        onActivate={() => openCloseup(id)}
        // in its own closeup the screen is not an interactable: no outline, tag or E prompt over the program
        enabled={() => runtime.closeup?.id !== id}
      />
    </>
  );
}
