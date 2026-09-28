import { useEffect, useLayoutEffect, useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { clampToDesk, fitOnOpen, windowMaxHeight, type WindowId } from './window-manager';
import { useWM } from './WindowManagerContext';
import { snapIn } from '@/lib/motion';
import { usePhoneMode } from './usePhoneMode';

export interface WindowFrameProps {
  id: WindowId;
  title: string;
  width: number;
  height?: number;
  x: number;
  y: number;
  z: number;
  focused: boolean;
  minimized: boolean;
  children: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Rendered = no `display:none` on the element or any ancestor up to `root`.
 *  Computed style, not getClientRects: jsdom has no layout, so rects are always empty there. */
function isRendered(el: HTMLElement, root: HTMLElement): boolean {
  for (let n: HTMLElement | null = el; n && n !== root; n = n.parentElement) {
    if (getComputedStyle(n).display === 'none') return false;
  }
  return true;
}

function containTab(e: KeyboardEvent, root: HTMLElement) {
  // skip non-rendered controls (e.g. .back is display:none on desktop) — focusing one is a no-op
  const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => isRendered(el, root));
  if (items.length === 0) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && (document.activeElement === first || document.activeElement === root)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

export function WindowFrame({ id, title, width, height, x, y, z, focused, minimized, children }: WindowFrameProps) {
  const wm = useWM();
  const phone = usePhoneMode();
  const ref = useRef<HTMLElement>(null);
  const labelId = `wt-${id.replace(/[^a-z0-9]/gi, '-')}`;

  useEffect(() => {
    if (ref.current) snapIn(ref.current);
  }, []);

  // fit onto the desk on mount (window may cascade past a small viewport); its height is capped by windowMaxHeight
  useLayoutEffect(() => {
    const el = ref.current;
    const desk = el?.offsetParent as HTMLElement | null;
    if (!el || !desk || phone) return;
    const p = fitOnOpen(x, y, el.offsetWidth, desk.clientWidth, desk.clientHeight);
    if (p.x !== x || p.y !== y) wm.move(id, p.x, p.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // when this window becomes focused and focus is elsewhere, move DOM focus into it
  useEffect(() => {
    const el = ref.current;
    if (focused && el && !el.contains(document.activeElement)) {
      el.focus({ preventScroll: true });
    }
  }, [focused]);

  /** Close; on phone, "back" lands on the home screen: if the window had no opener to hand focus
   *  back to (the auto-opened Bot), focus its home-screen icon instead of dropping to <body>. */
  const close = () => {
    wm.close(id);
    if (!phone) return;
    // queued after wm.close's own opener-focus frame, so an opener still wins
    requestAnimationFrame(() => {
      const a = document.activeElement;
      if (a && a !== document.body && a.isConnected) return;
      const home = Array.from(document.querySelectorAll<HTMLElement>('#icons [data-app]')).find((el) => el.dataset.app === id);
      home?.focus({ preventScroll: true });
    });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    } else if (e.key === 'Tab' && ref.current) {
      containTab(e, ref.current);
    }
  };

  const onTitlePointerDown = (e: PointerEvent) => {
    if (phone) return; // no window dragging on touch (spec §2.4)
    const el = ref.current;
    const desk = el?.offsetParent as HTMLElement | null;
    if (!el || !desk || e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    const tb = e.currentTarget as HTMLElement;
    const offX = e.clientX - el.offsetLeft;
    const offY = e.clientY - el.offsetTop;
    tb.setPointerCapture(e.pointerId);
    tb.classList.add('dragging');
    const move = (ev: globalThis.PointerEvent) => {
      const p = clampToDesk(ev.clientX - offX, ev.clientY - offY, el.offsetWidth, desk.clientWidth, desk.clientHeight);
      el.style.left = `${p.x}px`;
      el.style.top = `${p.y}px`;
      el.style.maxHeight = windowMaxHeight(p.y);
    };
    const up = () => {
      tb.classList.remove('dragging');
      tb.removeEventListener('pointermove', move);
      tb.removeEventListener('pointerup', up);
      tb.removeEventListener('pointercancel', up);
      wm.move(id, el.offsetLeft, el.offsetTop);
    };
    tb.addEventListener('pointermove', move);
    tb.addEventListener('pointerup', up);
    tb.addEventListener('pointercancel', up);
  };

  // `hidden` lives on an unstyled, unpositioned wrapper, not on .win itself:
  // (1) `.win { display: flex }` would override the [hidden] UA rule in a real browser;
  // (2) accessible-name computation returns "" for an element that is itself hidden.
  // The wrapper is layout-neutral: .win stays absolutely positioned against #wins.
  return (
    <div className="win-slot" hidden={minimized}>
      <section
        ref={ref}
        className={`win${focused ? ' active' : ''}`}
        role="dialog"
        aria-labelledby={labelId}
        tabIndex={-1}
        data-id={id}
        style={{ left: x, top: y, zIndex: z, width, height, maxHeight: windowMaxHeight(y) }}
        onKeyDown={onKeyDown}
        onPointerDownCapture={() => { if (!focused) wm.focus(id); }}
      >
        <header className={`tb${focused ? '' : ' dark'}`} onPointerDown={onTitlePointerDown}>
          <button type="button" className="back" aria-label={`Back, close ${title}`} onClick={close}>‹</button>
          <h2 id={labelId}>{title}</h2>
          <button type="button" className="min" aria-label={`Minimize ${title}`} onClick={() => wm.minimize(id)}>–</button>
          <button type="button" className="close" aria-label={`Close ${title}`} onClick={close}>×</button>
        </header>
        <div className="body">{children}</div>
      </section>
    </div>
  );
}
