import { createContext, useCallback, useContext, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { cascadePosition, initialWM, wmReducer, type WindowId, type WMState } from './window-manager';

export interface WM {
  state: WMState;
  open: (id: WindowId, opener?: HTMLElement | null) => void;
  close: (id: WindowId) => void;
  minimize: (id: WindowId) => void;
  restore: (id: WindowId) => void;
  focus: (id: WindowId) => void;
  move: (id: WindowId, x: number, y: number) => void;
  cycle: () => void;
}

const WMContext = createContext<WM | null>(null);

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wmReducer, initialWM);
  const openers = useRef(new Map<WindowId, HTMLElement>());
  const countRef = useRef(0);
  countRef.current = state.windows.length;

  const open = useCallback((id: WindowId, opener?: HTMLElement | null) => {
    if (opener) openers.current.set(id, opener);
    const pos = cascadePosition(countRef.current);
    dispatch({ type: 'OPEN', id, x: pos.x, y: pos.y });
  }, []);

  const close = useCallback((id: WindowId) => {
    dispatch({ type: 'CLOSE', id });
    const opener = openers.current.get(id);
    openers.current.delete(id);
    if (opener && opener.isConnected) {
      requestAnimationFrame(() => opener.focus({ preventScroll: true }));
    }
  }, []);

  const api = useMemo<WM>(() => ({
    state,
    open,
    close,
    minimize: (id) => dispatch({ type: 'MINIMIZE', id }),
    restore: (id) => dispatch({ type: 'RESTORE', id }),
    focus: (id) => dispatch({ type: 'FOCUS', id }),
    move: (id, x, y) => dispatch({ type: 'MOVE', id, x, y }),
    cycle: () => dispatch({ type: 'CYCLE' }),
  }), [state, open, close]);

  return <WMContext.Provider value={api}>{children}</WMContext.Provider>;
}

// hook co-located with its provider by design; fast-refresh falls back to a full reload for this file
// eslint-disable-next-line react-refresh/only-export-components
export function useWM(): WM {
  const wm = useContext(WMContext);
  if (!wm) throw new Error('useWM must be used inside <WindowManagerProvider>');
  return wm;
}
