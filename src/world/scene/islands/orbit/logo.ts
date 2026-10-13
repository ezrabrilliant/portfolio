import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { ORBIT_LOGO, pointInPolygon, ringPoint, toTile } from "./logoMath";

const S = ORBIT_LOGO.size / ORBIT_LOGO.src;
const FACE_Z = 0.12; // tile face, clear of the frame's front at 0.11 (no depth flicker at distance)
/** How far the cut runs past the O's outline: covers the O's side walls and the cut's own parallax from the tour angle. */
const CUT_PAD = 0.1;

/** The logo's radial background, stops sampled from logo.jpg (centre (997, 983) px, reaching #2C0B77 at the corners). */
function gradientTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 1024;
  const g = c.getContext("2d");
  if (g) {
    const gr = g.createRadialGradient(510, 503, 0, 510, 503, 724);
    gr.addColorStop(0, "#3D62F8");
    gr.addColorStop(0.21, "#374fd9");
    gr.addColorStop(0.35, "#323fc0");
    gr.addColorStop(0.5, "#2d31a9");
    gr.addColorStop(0.64, "#2e2499");
    gr.addColorStop(0.78, "#32198e");
    gr.addColorStop(1, "#2C0B77");
    g.fillStyle = gr;
    g.fillRect(0, 0, 1024, 1024);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function roundedQuad(pts: { x: number; y: number }[], radii: number[]): THREE.Shape {
  const s = new THREE.Shape();
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = new THREE.Vector2(pts[i].x, pts[i].y);
    const prev = new THREE.Vector2(pts[(i + n - 1) % n].x, pts[(i + n - 1) % n].y);
    const next = new THREE.Vector2(pts[(i + 1) % n].x, pts[(i + 1) % n].y);
    const p1 = p.clone().add(prev.sub(p).normalize().multiplyScalar(radii[i]));
    const p2 = p.clone().add(next.sub(p).normalize().multiplyScalar(radii[i]));
    if (i === 0) s.moveTo(p1.x, p1.y);
    else s.lineTo(p1.x, p1.y);
    s.quadraticCurveTo(p.x, p.y, p2.x, p2.y);
  }
  s.closePath();
  return s;
}

/**
 * The logo's cut line: where the ring's front arc crosses the O, a thin strip of background shows along the ring's
 * outer edge. A flat ribbon in ring-local space (inside the tilted ring group), mapped with the tile's own gradient
 * at its tile position, so it reads as the background showing through and is invisible wherever the tile is behind it.
 */
function cutLineGeometry(): THREE.BufferGeometry {
  const outline = ORBIT_LOGO.outer.map(([x, y]) => toTile(x, y));
  const hole = ORBIT_LOGO.hole.map(([x, y]) => toTile(x, y));
  const c = toTile(ORBIT_LOGO.ringCenter[0], ORBIT_LOGO.ringCenter[1]);
  const cos = Math.cos(ORBIT_LOGO.ringTilt);
  const sin = Math.sin(ORBIT_LOGO.ringTilt);
  const tile = (x: number, y: number) => ({ x: c.x + x * cos - y * sin, y: c.y + x * sin + y * cos });
  const a = ORBIT_LOGO.ra * S;
  const b = ORBIT_LOGO.rb * S;
  const d0 = ORBIT_LOGO.tube * 0.5; // starts under the tube: no white sliver between ring and cut
  const d1 = ORBIT_LOGO.tube + ORBIT_LOGO.rim;
  const N = 240;
  const samples: { x: number; y: number; z: number; nx: number; ny: number; over: boolean }[] = [];
  for (let i = 0; i <= N; i++) {
    const th = (i / N) * Math.PI; // the front arc
    const p = ringPoint(th);
    const l = Math.hypot(b * Math.cos(th), a * Math.sin(th)) || 1;
    const nx = (b * Math.cos(th)) / l; // outward normal of the ellipse
    const ny = (-a * Math.sin(th)) / l;
    const mid = tile(p.x + nx * (d0 + d1) * 0.5, p.y + ny * (d0 + d1) * 0.5);
    samples.push({ ...p, nx, ny, over: pointInPolygon(mid, outline) && !pointInPolygon(mid, hole) });
  }
  // Past the outline the cut lies over the tile (or the tile seen through the hole) and is invisible there, so it can
  // run on far enough to cover the bars' side walls seen at an angle instead of ending in a square dash.
  const mids = samples.map((s) => ({ x: s.x + s.nx * (d0 + d1) * 0.5, y: s.y + s.ny * (d0 + d1) * 0.5 }));
  const overMids = mids.filter((_, i) => samples[i].over);
  const keep = mids.map((m) => overMids.some((o) => Math.hypot(m.x - o.x, m.y - o.y) <= CUT_PAD));
  const pos: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= N; i++) {
    if (!keep[i]) continue;
    const s = samples[i];
    for (const d of [d0, d1]) {
      const x = s.x + s.nx * d;
      const y = s.y + s.ny * d;
      const t = tile(x, y);
      pos.push(x, y, s.z);
      uv.push(t.x / ORBIT_LOGO.size + 0.5, t.y / ORBIT_LOGO.size + 0.5);
    }
    const k = pos.length / 3 - 2;
    if (i > 0 && keep[i - 1]) index.push(k - 2, k, k - 1, k - 1, k, k + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(index);
  return geo;
}

/** 2.4 × 2.4 Orbit logo tile facing +z, centred on the origin. Dispose with disposeObject(). */
export function createOrbitLogoTile(): THREE.Group {
  const group = new THREE.Group();

  const frame = new THREE.Mesh(new RoundedBoxGeometry(2.4, 2.4, 0.22, 3, 0.3), new THREE.MeshStandardMaterial({ color: "#2a2f9e", roughness: 0.6 }));
  frame.castShadow = true;
  group.add(frame);

  // A lit sign face: the brand gradient exactly, not shaded or tone-mapped by the warm sun.
  const tex = gradientTexture();
  const face = new THREE.Mesh(new THREE.PlaneGeometry(ORBIT_LOGO.size, ORBIT_LOGO.size), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  face.position.z = FACE_Z;
  group.add(face);

  const outline = roundedQuad(ORBIT_LOGO.outer.map(([x, y]) => toTile(x, y)), ORBIT_LOGO.radii.map((r) => r * S));
  const hole = new THREE.Path(ORBIT_LOGO.hole.map(([x, y]) => {
    const p = toTile(x, y);
    return new THREE.Vector2(p.x, p.y);
  }));
  hole.closePath();
  outline.holes.push(hole);
  // bevelOffset = −bevelSize: the side walls lie exactly on the traced outline (the true silhouette), the bevel eats inward
  const bevel = 0.02;
  const oGeo = new THREE.ExtrudeGeometry(outline, {
    depth: ORBIT_LOGO.depth - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: 0.015, bevelOffset: -0.015, bevelSegments: 2, curveSegments: 12,
  });
  oGeo.translate(0, 0, -ORBIT_LOGO.depth / 2 + bevel);

  const white = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 0.35, roughness: 0.45, toneMapped: false });
  const mark = new THREE.Group();
  mark.position.z = FACE_Z + ORBIT_LOGO.standoff;
  const o = new THREE.Mesh(oGeo, white);
  o.castShadow = true;
  mark.add(o);

  const points: THREE.Vector3[] = [];
  for (let i = 0; i < 96; i++) {
    const p = ringPoint((i / 96) * Math.PI * 2);
    points.push(new THREE.Vector3(p.x, p.y, p.z));
  }
  const curve = new THREE.CatmullRomCurve3(points, true);
  // a flat white stroke like the logo's ring (the O keeps its shaded sides)
  const ring = new THREE.Mesh(new THREE.TubeGeometry(curve, 200, ORBIT_LOGO.tube, 8, true), new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }));
  // Drawn after the O without depth writes, so it covers the O but never the ring drawn after it.
  const cut = new THREE.Mesh(cutLineGeometry(), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, depthWrite: false }));
  cut.renderOrder = 1;
  ring.renderOrder = 2;
  const centre = toTile(ORBIT_LOGO.ringCenter[0], ORBIT_LOGO.ringCenter[1]);
  const ringGroup = new THREE.Group();
  ringGroup.position.set(centre.x, centre.y, 0);
  ringGroup.rotation.z = ORBIT_LOGO.ringTilt;
  ringGroup.add(cut, ring);
  mark.add(ringGroup);
  group.add(mark);
  return group;
}
