import { useEffect, useRef } from 'react';
import { focusedId, type WindowId } from './window-manager';
import { getAppDef } from './app-registry';
import { useWM } from './WindowManagerContext';

export function Dock() {
  const wm = useWM();
  const focused = focusedId(wm.state);
  const buttons = useRef(new Map<WindowId, HTMLButtonElement>());
  const prevFocused = useRef<WindowId | null>(null);

  // Minimizing the LAST visible window leaves no window to take focus (WindowFrame hands focus to the
  // next focused window when there is one), so DOM focus would drop to <body>. Park it on that window's
  // dock entry instead: the keyboard user keeps their place and can restore with Enter.
  useEffect(() => {
    const prev = prevFocused.current;
    prevFocused.current = focused;
    if (focused !== null || prev === null) return;
    const w = wm.state.windows.find((x) => x.id === prev);
    if (w?.minimized) buttons.current.get(prev)?.focus({ preventScroll: true });
  }, [focused, wm.state.windows]);

  return (
    <nav id="dock" className="dark" aria-label="Open windows">
      {wm.state.windows.map((w) => {
        const def = getAppDef(w.id);
        if (!def) return null;
        const on = focused === w.id;
        return (
          <button
            key={w.id}
            ref={(el) => {
              if (el) buttons.current.set(w.id, el);
              else buttons.current.delete(w.id);
            }}
            type="button"
            className={`${on ? 'on' : ''}${w.minimized ? ' min' : ''}`.trim()}
            aria-label={`${def.title} window${w.minimized ? ', minimized' : ''}`}
            onClick={() => {
              if (w.minimized) wm.restore(w.id);
              else if (on) wm.minimize(w.id);
              else wm.focus(w.id);
            }}
          >
            <span className="sq" aria-hidden="true" />
            {def.title}
          </button>
        );
      })}
    </nav>
  );
}
