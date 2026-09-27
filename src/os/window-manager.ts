export type WindowId = string;

export interface WindowRecord {
  id: WindowId;
  x: number;
  y: number;
  z: number;
  minimized: boolean;
}

export interface WMState {
  windows: WindowRecord[];
  nextZ: number;
}

export type WMAction =
  | { type: 'OPEN'; id: WindowId; x: number; y: number }
  | { type: 'CLOSE'; id: WindowId }
  | { type: 'MINIMIZE'; id: WindowId }
  | { type: 'RESTORE'; id: WindowId }
  | { type: 'FOCUS'; id: WindowId }
  | { type: 'MOVE'; id: WindowId; x: number; y: number }
  | { type: 'CYCLE' };

export const initialWM: WMState = { windows: [], nextZ: 1 };

export function focusedId(state: WMState): WindowId | null {
  let best: WindowRecord | null = null;
  for (const w of state.windows) {
    if (!w.minimized && (!best || w.z > best.z)) best = w;
  }
  return best ? best.id : null;
}

/** New windows cascade from the top-left of the free area; wraps after 8. */
export function cascadePosition(openCount: number): { x: number; y: number } {
  const n = openCount % 8;
  return { x: 48 + n * 32, y: 24 + n * 28 };
}

/** ≥80px of the window stays horizontally visible; the title bar (30px) stays inside the desk. */
export function clampToDesk(x: number, y: number, winWidth: number, deskW: number, deskH: number): { x: number; y: number } {
  return {
    x: Math.round(Math.min(Math.max(x, -(winWidth - 80)), deskW - 80)),
    y: Math.round(Math.min(Math.max(y, 0), deskH - 30)),
  };
}

function raise(state: WMState, id: WindowId, unminimize: boolean): WMState {
  return {
    nextZ: state.nextZ + 1,
    windows: state.windows.map((w) =>
      w.id === id ? { ...w, z: state.nextZ, minimized: unminimize ? false : w.minimized } : w,
    ),
  };
}

export function wmReducer(state: WMState, action: WMAction): WMState {
  switch (action.type) {
    case 'OPEN': {
      if (state.windows.some((w) => w.id === action.id)) return raise(state, action.id, true);
      return {
        nextZ: state.nextZ + 1,
        windows: [...state.windows, { id: action.id, x: action.x, y: action.y, z: state.nextZ, minimized: false }],
      };
    }
    case 'CLOSE':
      return { ...state, windows: state.windows.filter((w) => w.id !== action.id) };
    case 'MINIMIZE':
      return {
        ...state,
        windows: state.windows.map((w) => (w.id === action.id ? { ...w, minimized: true } : w)),
      };
    case 'RESTORE':
    case 'FOCUS':
      return raise(state, action.id, true);
    case 'MOVE':
      return {
        ...state,
        windows: state.windows.map((w) => (w.id === action.id ? { ...w, x: action.x, y: action.y } : w)),
      };
    case 'CYCLE': {
      const visible = state.windows.filter((w) => !w.minimized);
      if (visible.length < 2) return state;
      const backMost = visible.reduce((a, b) => (a.z < b.z ? a : b));
      return raise(state, backMost.id, false);
    }
  }
}
