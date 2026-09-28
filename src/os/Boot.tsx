import { useEffect, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { getProjectCount } from '@/config/os-content';
import { prefersReducedMotion } from '@/lib/motion';
import { usePhoneMode } from './usePhoneMode';

// eslint-disable-next-line react-refresh/only-export-components
export function bootLines(projectCount: number): string[] {
  return [
    'EzraOS 1.0 — Surabaya build',
    `mounting /projects ........ ${projectCount} found`,
    'starting ezra-bot ......... 1,000+ members connected',
    'market feed ............... ~14.5k req/day',
    'roblox bridge ............. 3.1M visits recorded',
    'orbit store ............... 2,700+ orders settled',
    'ready.',
  ];
}

const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'AltGraph', 'Meta', 'OS']);

/** Keys the boot must never swallow: bare modifiers, Ctrl/Cmd shortcuts (Ctrl+R), function keys (F5, F12). */
function isBrowserShortcut(e: KeyboardEvent): boolean {
  return MODIFIER_KEYS.has(e.key) || e.ctrlKey || e.metaKey || /^F\d{1,2}$/.test(e.key);
}

/**
 * After a click skips the boot, the rest of that gesture is swallowed for this long: a double-click's
 * 2nd press, click and dblclick would otherwise land on the freshly mounted desktop and open an app.
 */
export const SKIP_GRACE_MS = 400;
const GRACE_EVENTS = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click', 'dblclick'] as const;

/** Outlives Boot on purpose: Boot unmounts right after the skip, the desktop mounts underneath. */
function swallowPointerGrace() {
  const stop = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
  };
  for (const t of GRACE_EVENTS) window.addEventListener(t, stop, true);
  window.setTimeout(() => {
    for (const t of GRACE_EVENTS) window.removeEventListener(t, stop, true);
  }, SKIP_GRACE_MS);
}

export function Boot({ onDone }: { onDone: () => void }) {
  const phone = usePhoneMode();
  const logRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);
  // Latest onDone without restarting the timeline when the parent re-renders with a new callback.
  const onDoneRef = useRef(onDone);
  useLayoutEffect(() => { onDoneRef.current = onDone; });

  useEffect(() => {
    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      onDoneRef.current();
    };

    if (prefersReducedMotion()) {
      finish();
      return;
    }
    const tl = gsap.timeline();
    bootLines(getProjectCount()).forEach((text, i) => {
      tl.call(() => {
        const d = document.createElement('div');
        d.textContent = text;
        logRef.current?.append(d);
      }, [], i * 0.3);
    });
    if (rootRef.current) {
      tl.to(rootRef.current, { opacity: 0, duration: 0.18, ease: 'power1.in' }, 2.0);
    }
    tl.call(finish);

    // Capture phase on window: runs before React's root listener and Desktop's window keydown,
    // and stopPropagation keeps the skip gesture from reaching anything underneath.
    const consume = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      tl.kill();
      finish();
    };
    const onKey = (e: KeyboardEvent) => {
      if (isBrowserShortcut(e)) return;
      consume(e);
    };
    const onClick = (e: Event) => {
      const skipping = !doneRef.current;
      consume(e);
      if (skipping) swallowPointerGrace();
    };
    // Skip on click, not pointerdown: the whole press→release→click cycle stays on the boot layer,
    // so no stray click lands on the menu bar / dock / icons once the desktop mounts.
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('click', onClick, true);
    const log = logRef.current;
    return () => {
      tl.kill();
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('click', onClick, true);
      log?.replaceChildren();
    };
  }, []);

  if (prefersReducedMotion()) return null;

  return (
    <div
      id="boot"
      ref={rootRef}
      className="dark"
      role="status"
      aria-label={phone ? 'EzraOS is starting. Tap to skip.' : 'EzraOS is starting. Press any key or click to skip.'}
    >
      <div ref={logRef} aria-hidden="true" />
      <div className="skip">{phone ? 'tap to skip' : 'press any key to skip'}</div>
    </div>
  );
}
