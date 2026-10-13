import { create } from "zustand";
import { setMuted } from "@/world/engine/audio/sfx";
import { pickQuality, readDevice } from "./quality";

export type Mode = "tour" | "play";
export type Quality = "high" | "low";

export interface WorldState {
  mode: Mode;
  setMode(m: Mode): void;
  activeIsland: string;
  setActiveIsland(id: string): void;
  muted: boolean;
  toggleMuted(): void;
  quality: Quality;
  setQuality(q: Quality): void;
  hoveredId: string | null;
  setHovered(id: string | null): void;
  prompt: { id: string; label: string } | null;
  setPrompt(p: { id: string; label: string } | null): void;
  reducedMotion: boolean;
  ready: boolean;
  setReady(r: boolean): void;
}

const inBrowser = typeof window !== "undefined" && typeof window.matchMedia === "function";
const reducedMotion = inBrowser && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const initialQuality: Quality = inBrowser ? pickQuality(readDevice()) : "high";

export const useWorld = create<WorldState>()((set, get) => ({
  mode: "tour",
  setMode: (mode) => {
    // Play waits for the built world (ReadySignal): entering earlier would place Ezra before World's build
    // re-seats him. Covers every trigger: HUD button, move keys, phone Start, the ?play deep link
    if (mode === "play" && !get().ready) return;
    if (get().mode !== mode) set({ mode });
  },
  activeIsland: "hero",
  setActiveIsland: (activeIsland) => {
    if (get().activeIsland !== activeIsland) set({ activeIsland });
  },
  muted: true,
  toggleMuted: () => {
    const muted = !get().muted;
    setMuted(muted);
    set({ muted });
  },
  quality: initialQuality,
  setQuality: (quality) => {
    if (get().quality !== quality) set({ quality });
  },
  hoveredId: null,
  setHovered: (hoveredId) => {
    if (get().hoveredId !== hoveredId) set({ hoveredId });
  },
  prompt: null,
  setPrompt: (prompt) => {
    const cur = get().prompt;
    if ((cur?.id ?? null) !== (prompt?.id ?? null) || cur?.label !== prompt?.label) set({ prompt });
  },
  reducedMotion,
  ready: false,
  setReady: (ready) => {
    if (get().ready !== ready) set({ ready });
  },
}));
