import { EZRA_FIT, EZRA_HEAD } from "@/world/engine/physics/ezraModel";
import { bakeBoxes, type BakeBox } from "@/world/scene/shared/bake";
import { LEG } from "./anim";

/*
 * Ezra's baked body parts (scene/Ezra.tsx rigs them): one rounded, vertex-coloured geometry per part, each about its
 * pivot. Their extents come from engine/physics/ezraModel.ts, and its tests tie the two together.
 */

// colours from the approved sketch and the avatar photo: black tee, short black hair, jeans, light shoes
const C = {
  jeans: "#4b5a6e",
  shirt: "#2e3336",
  skin: "#d09676",
  hair: "#1e1b19",
  // the clipper-short sides and back: skin shows through, so they read lighter than the top, lightest at the nape
  fade: "#463830",
  nape: "#624a3e",
  shoe: "#e7e2d8",
  sole: "#b3ab9e",
};

/**
 * Bakes a rig part (boxes relative to the part's pivot) into one rounded, vertex-coloured geometry: one draw call per
 * part. Corners are rounded 0.035 unless a box gives its own radius.
 */
const part = (boxes: readonly BakeBox[]) => bakeBoxes(boxes, "Ezra's rig part", { radius: 0.035 });

/** A box `halfW` / `halfD` either side of its part's pivot axis (centred `z` forward), from height `bottom` up to `top`. */
function slab(halfW: number, halfD: number, bottom: number, top: number, colour: string, z = 0): BakeBox {
  return [2 * halfW, top - bottom, 2 * halfD, 0, (top + bottom) / 2, z, colour];
}

// model faces +Z, its left is +X; limbs are symmetric about their own pivot. The torso, hips, arms, legs and shoes are
// built from EZRA_FIT (engine/physics/ezraModel.ts), the measurements the graduation gown is cut to, so the two cannot
// drift apart; the head's pivot and its highest hair box come from EZRA_HEAD there too
const F = EZRA_FIT;
/** The shoe's top below the knee (the sole's bottom is LEG.shin below it). */
const SHOE_TOP = -(LEG.shin - F.shoe);
export const EZRA_GEOMETRY = {
  // pivot at the hip; runs half a leg past the knee so a bent knee stays square
  thigh: part([slab(F.thigh.half, F.thigh.half, -F.thigh.bottom, F.thigh.top, C.jeans)]),
  // pivot at the knee (LEG.knee below the hip); sole bottom at −LEG.shin, heel at LEG.back, toe at LEG.toe
  shin: part([
    slab(F.thigh.half, F.thigh.half, SHOE_TOP - 0.02, F.thigh.top, C.jeans),
    slab(0.12, 0.15, SHOE_TOP - 0.09, SHOE_TOP, C.shoe, 0.04),
    slab(0.125, 0.155, -LEG.shin, -LEG.shin + 0.035, C.sole, 0.04),
  ]),
  // body group origin (feet); the hips reach below the hip pivot so a seated Ezra has no gap under him
  body: part([
    slab(F.hips.halfW, F.hips.halfD, F.hips.bottom, F.hips.top, C.jeans),
    slab(F.torso.halfW, F.torso.halfD, F.torso.bottom, F.torso.top, C.shirt),
    [0.2, 0.08, 0.2, 0, 1.35, 0, C.skin],
  ]),
  // pivot at the shoulder: the tee sleeve, then the forearm and hand
  arm: part([
    slab(F.arm.halfW, F.arm.halfD, -F.arm.sleeve, F.arm.top, C.shirt),
    slab(F.arm.skin.halfW, F.arm.skin.halfD, -F.arm.hand, -F.arm.skin.top, C.skin),
  ]),
  // pivot at the base of the head
  head: part([
    [0.5, 0.46, 0.46, 0, 0.23, 0, C.skin],
    [0.05, 0.11, 0.09, 0.265, 0.2, -0.01, C.skin],
    [0.05, 0.11, 0.09, -0.265, 0.2, -0.01, C.skin],
    // face: two eyes and brows
    [0.065, 0.085, 0.02, 0.11, 0.19, 0.235, C.hair],
    [0.065, 0.085, 0.02, -0.11, 0.19, 0.235, C.hair],
    [0.11, 0.03, 0.02, 0.11, 0.275, 0.235, C.hair],
    [0.11, 0.03, 0.02, -0.11, 0.275, 0.235, C.hair],
    // tapered sides and back sit flush on the head so the ears show; only the top stands proud of them, and
    // that step is what reads as a haircut instead of a helmet
    [0.53, 0.25, 0.03, 0, 0.335, -0.238, C.fade, 0.01],
    [0.53, 0.14, 0.03, 0, 0.15, -0.238, C.nape, 0.01],
    [0.03, 0.17, 0.4, 0.258, 0.375, -0.03, C.fade, 0.01],
    [0.03, 0.17, 0.4, -0.258, 0.375, -0.03, C.fade, 0.01],
    [0.03, 0.08, 0.17, 0.258, 0.25, -0.155, C.fade, 0.01],
    [0.03, 0.08, 0.17, -0.258, 0.25, -0.155, C.fade, 0.01],
    [0.03, 0.14, 0.17, 0.258, 0.15, -0.155, C.nape, 0.01],
    [0.03, 0.14, 0.17, -0.258, 0.15, -0.155, C.nape, 0.01],
    [0.03, 0.07, 0.05, 0.258, 0.27, 0.105, C.fade, 0.01],
    [0.03, 0.07, 0.05, -0.258, 0.27, 0.105, C.fade, 0.01],
    // the top: a high hairline with his left temple lower, then messy volume pushed up and forward, one strand
    // flaring out at his right
    [0.54, 0.12, 0.49, 0, 0.5, 0.005, C.hair, 0.012],
    [0.54, 0.06, 0.05, 0, 0.445, 0.23, C.hair, 0.012],
    [0.15, 0.08, 0.05, 0.185, 0.4, 0.228, C.hair, 0.012],
    [0.05, 0.12, 0.12, 0.248, 0.43, 0.18, C.hair, 0.012],
    [0.26, EZRA_HEAD.crown.h, 0.24, -0.12, EZRA_HEAD.crown.y, 0.12, C.hair, 0.012],
    [0.2, 0.08, 0.18, 0.11, 0.575, 0.15, C.hair, 0.012],
    [0.3, 0.06, 0.2, 0, 0.57, -0.1, C.hair, 0.012],
    [0.06, 0.08, 0.14, -0.265, 0.55, 0.13, C.hair, 0.012],
  ]),
};
