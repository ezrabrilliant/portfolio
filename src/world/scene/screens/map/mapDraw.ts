import { CANVAS_FONTS } from "@/world/scene/islands/shared/canvasFonts";
import { roundRect } from "../format";
import { MAP_AREA, MAP_BUTTONS, MAP_LOGICAL } from "./mapModel";
import type { MapModel, MapPoint } from "./mapModel";

/** Wooden map-board colours: parchment, a pale sky, grass islands, plank bridges, iron rails. */
const C = {
  paper: "#efe6cf",
  sky: "#d6e5ea",
  skyLine: "#bfd3da",
  grass: "#8ea769",
  rim: "#5f7a45",
  earth: "#94714f",
  plank: "#8a6644",
  rail: "#3b3f44",
  arc: "#7c6f62",
  ink: "#2f2116",
  ink2: "#6b5640",
  here: "#c8432f",
  cursor: "#ffffff",
  button: "#f8f2e2",
  buttonLine: "#c9b893",
};

const font = (weight: number, px: number) => `${weight} ${px}px ${CANVAS_FONTS.ui}`;

function path(ctx: CanvasRenderingContext2D, pts: readonly MapPoint[]) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

/** The red "You are here" pin, its point at (x, y). */
function pin(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = C.here;
  ctx.beginPath();
  ctx.arc(x, y - 9, 4.5, Math.PI, 0);
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x, y - 9, 1.7, 0, Math.PI * 2);
  ctx.fill();
}

/** A filled triangle pointing left (dir −1) or right (dir 1), centred in the box. */
function arrow(ctx: CanvasRenderingContext2D, box: { x: number; y: number; w: number; h: number }, dir: 1 | -1) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  ctx.beginPath();
  ctx.moveTo(cx + 6 * dir, cy);
  ctx.lineTo(cx - 5 * dir, cy - 7);
  ctx.lineTo(cx - 5 * dir, cy + 7);
  ctx.closePath();
  ctx.fill();
}

/**
 * The map board: every island from above (tour left to right, further from the camera higher up), bridges as plank
 * lines, the minecart as a rail, bounce pads as a dotted arc, names, a "You are here" pin on the board's own island
 * (and its name in the header), a white ring on the cursor island, and the button bar (previous, "Travel to …", next).
 * Paints from the model only.
 */
export function drawMap(ctx: CanvasRenderingContext2D, model: MapModel, cursor: number): void {
  const { w, h } = MAP_LOGICAL;
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, w, h);

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = C.ink;
  ctx.font = font(700, 15);
  ctx.fillText("Map", MAP_AREA.x + 2, 21);
  // "You are here" in the header (a tag on the map would crowd the small islands' names)
  const here = model.islands[model.here];
  ctx.textAlign = "right";
  ctx.font = font(700, 10);
  ctx.fillStyle = C.ink;
  const name = here?.name ?? "";
  ctx.fillText(name, MAP_AREA.x + MAP_AREA.w - 2, 20);
  const nameW = ctx.measureText(name).width;
  ctx.font = font(500, 10);
  ctx.fillStyle = C.ink2;
  ctx.fillText("You are here: ", MAP_AREA.x + MAP_AREA.w - 2 - nameW, 20);
  const labelW = ctx.measureText("You are here: ").width;
  pin(ctx, MAP_AREA.x + MAP_AREA.w - 10 - nameW - labelW, 21);

  roundRect(ctx, MAP_AREA.x, MAP_AREA.y, MAP_AREA.w, MAP_AREA.h, 8);
  ctx.fillStyle = C.sky;
  ctx.fill();
  ctx.strokeStyle = C.skyLine;
  ctx.lineWidth = 1;
  ctx.stroke();

  // crossings under the islands
  ctx.lineCap = "round";
  for (const l of model.links) {
    ctx.beginPath();
    if (l.kind === "bouncePads") {
      const mx = (l.a.x + l.b.x) / 2;
      const my = Math.min(l.a.y, l.b.y) - 10;
      ctx.setLineDash([1.5, 4]);
      ctx.strokeStyle = C.arc;
      ctx.lineWidth = 2;
      ctx.moveTo(l.a.x, l.a.y);
      ctx.quadraticCurveTo(mx, my, l.b.x, l.b.y);
    } else {
      ctx.setLineDash(l.kind === "minecart" ? [5, 3] : []);
      ctx.strokeStyle = l.kind === "minecart" ? C.rail : C.plank;
      ctx.lineWidth = l.kind === "minecart" ? 2 : 3;
      ctx.moveTo(l.a.x, l.a.y);
      ctx.lineTo(l.b.x, l.b.y);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);

  model.islands.forEach((isl, i) => {
    // a sliver of earth under the grass reads as a floating island
    ctx.save();
    ctx.translate(0, 2);
    path(ctx, isl.outline);
    ctx.fillStyle = C.earth;
    ctx.fill();
    ctx.restore();
    path(ctx, isl.outline);
    ctx.fillStyle = C.grass;
    ctx.fill();
    ctx.strokeStyle = C.rim;
    ctx.lineWidth = 1;
    ctx.stroke();
    if (i === cursor) {
      ctx.save();
      ctx.translate(isl.c.x, isl.c.y);
      ctx.scale(1.18, 1.18);
      ctx.translate(-isl.c.x, -isl.c.y);
      path(ctx, isl.outline);
      ctx.restore();
      ctx.strokeStyle = C.cursor;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  });

  // names, all in one weight: their places were fitted to that width (LABEL_CHAR_W); the ring marks the cursor island
  ctx.textAlign = "center";
  ctx.font = font(500, 9.5);
  ctx.fillStyle = C.ink;
  model.islands.forEach((isl) => {
    ctx.fillText(isl.name, isl.label.x, isl.label.y);
  });

  // the board's own island carries the pin
  if (here) pin(ctx, here.c.x, here.c.y);

  // button bar
  const { prev, go, next } = MAP_BUTTONS;
  for (const b of [prev, go, next]) {
    roundRect(ctx, b.x, b.y, b.w, b.h, 6);
    ctx.fillStyle = C.button;
    ctx.fill();
    ctx.strokeStyle = C.buttonLine;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.fillStyle = C.ink;
  arrow(ctx, prev, -1);
  arrow(ctx, next, 1);
  const target = model.islands[cursor];
  const atHome = cursor === model.here;
  ctx.font = font(700, 12);
  ctx.fillStyle = atHome ? C.ink2 : C.ink;
  ctx.fillText(atHome ? "You are here" : `Travel to ${target?.name ?? ""}`, go.x + go.w / 2, go.y + go.h / 2 + 4);
}
