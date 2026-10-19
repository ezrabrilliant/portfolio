import { create } from "zustand";
import { isMuted, restoreSoundPref, setMuted, subscribeAudio } from "@/world/engine/audio/core";
import { pickQuality, readDevice } from "./quality";

export type Mode = "tour" | "play";
export type Quality = "high" | "low";

export interface WorldState {
  mode: Mode;
  setMode(m: Mode): void;
  activeIsland: string;
  setActiveIsland(id: string): void;
  /** The sound is off. The audio engine (engine/audio/core) owns it and keeps it in this browser; this mirrors it. */
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
  /** Id of the screen in closeup, or null (openCloseup / closeCloseup write it together with runtime.closeup). */
  closeupId: string | null;
  setCloseup(id: string | null): void;
  /** The HUD's island map overlay (MapOverlay) is open: world input waits behind it. */
  mapOpen: boolean;
  setMapOpen(open: boolean): void;
  /** Ezra Bot's chat (BotChat) is open: world input waits behind it. */
  botOpen: boolean;
  setBotOpen(open: boolean): void;
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
  // on unless the visitor switched it off; it starts on their first click, key or touch (core.restoreSoundPref)
  muted: restoreSoundPref(),
  toggleMuted: () => setMuted(!get().muted),
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
  closeupId: null,
  setCloseup: (closeupId) => {
    if (get().closeupId !== closeupId) set({ closeupId });
  },
  botOpen: false,
  setBotOpen: (botOpen) => {
    if (get().botOpen !== botOpen) set({ botOpen });
  },
  mapOpen: false,
  setMapOpen: (mapOpen) => {
    if (get().mapOpen !== mapOpen) set({ mapOpen });
  },
}));

// the engine is the one source of truth: a switch from anywhere (the HUD, a synth that failed to load) shows here
subscribeAudio(() => {
  if (useWorld.getState().muted !== isMuted()) useWorld.setState({ muted: isMuted() });
});
