import { useEffect } from "react";
import { useWorld } from "@/world/state/store";

export function ReadySignal() {
  useEffect(() => {
    let b = 0;
    const a = requestAnimationFrame(() => {
      b = requestAnimationFrame(() => useWorld.getState().setReady(true));
    });
    return () => {
      cancelAnimationFrame(a);
      cancelAnimationFrame(b);
    };
  }, []);
  return null;
}
