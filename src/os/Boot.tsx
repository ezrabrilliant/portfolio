import { useEffect, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { getProjectCount } from '@/config/os-content';
import { prefersReducedMotion } from '@/lib/motion';

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

export function Boot({ onDone }: { onDone: () => void }) {
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
    // Skip on click, not pointerdown: the whole press→release→click cycle stays on the boot layer,
    // so no stray click lands on the menu bar / dock / icons once the desktop mounts.
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('click', consume, true);
    const log = logRef.current;
    return () => {
      tl.kill();
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('click', consume, true);
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
      aria-label="EzraOS is starting. Press any key or click to skip."
    >
      <div ref={logRef} aria-hidden="true" />
      <div className="skip">press any key to skip</div>
    </div>
  );
}
