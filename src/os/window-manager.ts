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

/** Gutter between the desktop icon column and the first cascaded window. */
export const ICON_GUTTER = 24;
/**
 * Left edge of the free desk area when the icon column is a single column:
 * os.css `.icon-col` sits at left 12 px with 88 px columns, so 12 + 88 + gutter.
 * A short desk wraps the icons into more columns; the provider then measures the real edge.
 */
export const CASCADE_ORIGIN_X = 12 + 88 + ICON_GUTTER;

/** New windows cascade from the top-left of the free area (right of the icons); wraps after 8. */
export function cascadePosition(openCount: number, originX: number = CASCADE_ORIGIN_X): { x: number; y: number } {
  const n = openCount % 8;
  return { x: originX + n * 32, y: 24 + n * 28 };
}

/** Space kept between a window's bottom/right edge and the dock/screen edge. */
export const DESK_MARGIN = 8;
/** Smallest a window is capped to: the 30 px title bar plus a usable strip of body. */
export const MIN_WIN_HEIGHT = 120;

/**
 * Max height for a window whose top edge is at `y`: it ends DESK_MARGIN above the dock (spec §3:
 * windows stay fully within the viewport). Applies to fixed-height apps too — their scroll areas
 * (flex: 1; min-height: 0) absorb the difference. Percent = the desk (#wins is inset: 0 of #desk).
 */
export function windowMaxHeight(y: number): string {
  return `max(${MIN_WIN_HEIGHT}px, 100% - ${Math.round(y) + DESK_MARGIN}px)`;
}

/**
 * Placement when a window first appears: shift it left so its full width is on the desk when the
 * desk is wide enough (else pin it to the left edge), and pull it up so at least a MIN_WIN_HEIGHT
 * window fits above the dock.
 */
export function fitOnOpen(x: number, y: number, winWidth: number, deskW: number, deskH: number): { x: number; y: number } {
  return {
    x: Math.round(Math.max(0, Math.min(x, deskW - DESK_MARGIN - winWidth))),
    y: Math.round(Math.max(0, Math.min(y, deskH - DESK_MARGIN - MIN_WIN_HEIGHT))),
  };
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
