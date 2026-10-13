import type { JSX } from "react";
import { SeoMirror } from "./SeoMirror";

export function NoWebGL(): JSX.Element {
  return (
    <div className="nowebgl">
      <p className="nowebgl-note">This browser can't run the 3D world, so here is the plain version.</p>
      <SeoMirror visible />
    </div>
  );
}
