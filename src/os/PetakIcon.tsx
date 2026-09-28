import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { gsap } from 'gsap';
import { CATCHES_TO_OPEN, FLEE_COOLDOWN_MS, FLEE_RADIUS, freeSpot, overlaps, type Rect } from '@/apps/petak-flee';
import { prefersReducedMotion } from '@/lib/motion';
import { GLYPHS } from './icons';
import { useWM } from './WindowManagerContext';

function rectOf(el: Element, desk: Element, pad = 0): Rect {
  const d = desk.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { l: r.left - d.left - pad, t: r.top - d.top - pad, r: r.right - d.left + pad, b: r.bottom - d.top + pad };
}

const deskOf = (el: Element | null) => (el?.closest('#desk') as HTMLElement | null) ?? null;

/**
 * The desktop toy (spec §2.3.7). Mouse/pen: flees when the pointer comes within FLEE_RADIUS,
 * 3 catches open the window. Keyboard, touch tap and reduced motion open it directly.
 */
export function PetakIcon() {
  const wm = useWM();
  const ref = useRef<HTMLButtonElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);
  const [catches, setCatches] = useState(0);
  const [fled, setFled] = useState(false);
  const [caught, setCaught] = useState(false);
  const catchesRef = useRef(0);
  const caughtRef = useRef(false);
  const fleeingRef = useRef(false);
  const coolRef = useRef(0);
  const swallowClickRef = useRef(false);

  /** Icon column, the visible counter and every non-minimized window, in desk coordinates. */
  const obstacles = (desk: HTMLElement): Rect[] => {
    const list: Rect[] = [];
    const col = desk.querySelector('.icon-col');
    if (col) list.push(rectOf(col, desk, 10));
    const c = counterRef.current;
    if (c && !c.hidden) list.push(rectOf(c, desk, 12));
    for (const win of desk.querySelectorAll('.win-slot:not([hidden]) > .win')) list.push(rectOf(win, desk, 8));
    return list;
  };

  const spotFor = (el: HTMLElement, desk: HTMLElement, avoid?: { x: number; y: number }) =>
    freeSpot({
      deskW: desk.clientWidth, deskH: desk.clientHeight,
      iconW: el.offsetWidth, iconH: el.offsetHeight,
      obstacles: obstacles(desk), avoid,
    });

  /** One short dart away from the pointer, then a breather before it can flee again. */
  const hop = (el: HTMLElement, clientX: number, clientY: number) => {
    const desk = deskOf(el);
    if (!desk) return;
    const d = desk.getBoundingClientRect();
    const spot = spotFor(el, desk, { x: clientX - d.left, y: clientY - d.top });
    fleeingRef.current = true;
    setFled(true);
    gsap.to(el, {
      left: spot.x, top: spot.y, duration: 0.18, ease: 'power3.out', overwrite: true,
      onComplete: () => { fleeingRef.current = false; coolRef.current = performance.now() + FLEE_COOLDOWN_MS; },
    });
  };

  // initial resting place: bottom-right corner of the desk (before paint, so no flash at 0,0)
  useLayoutEffect(() => {
    const el = ref.current;
    const desk = deskOf(el);
    if (!el || !desk) return;
    el.style.left = `${Math.max(8, desk.clientWidth - el.offsetWidth - 48)}px`;
    el.style.top = `${Math.max(8, desk.clientHeight - el.offsetHeight - 36)}px`;
  }, []);

  // Keep it reachable: if a window now covers it, or a resize pushed it off the desk, re-place it
  // instantly (no tween: this is housekeeping, not a flee). One frame later so a just-opened
  // window has its final geometry.
  const windows = wm.state.windows;
  useEffect(() => {
    const place = () => {
      const el = ref.current;
      const desk = deskOf(el);
      if (!el || !desk || fleeingRef.current) return;
      const me = rectOf(el, desk);
      const off = me.l < 0 || me.t < 0 || me.r > desk.clientWidth || me.b > desk.clientHeight;
      if (!off && !obstacles(desk).some((o) => overlaps(me, o))) return;
      const spot = spotFor(el, desk);
      gsap.killTweensOf(el);
      el.style.left = `${spot.x}px`;
      el.style.top = `${spot.y}px`;
    };
    const raf = requestAnimationFrame(place);
    window.addEventListener('resize', place);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', place); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windows]);

  // the chase: mouse/pen only, never under reduced motion, never once caught
  useEffect(() => {
    if (caught) return;
    const onMove = (e: PointerEvent) => {
      const el = ref.current;
      if (!el || e.pointerType === 'touch' || fleeingRef.current || prefersReducedMotion()) return;
      if (performance.now() < coolRef.current) return;
      const r = el.getBoundingClientRect();
      const dist = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
      if (dist < FLEE_RADIUS) hop(el, e.clientX, e.clientY);
    };
    document.addEventListener('pointermove', onMove);
    return () => document.removeEventListener('pointermove', onMove);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caught]);

  useEffect(() => {
    const el = ref.current;
    return () => { if (el) gsap.killTweensOf(el); };
  }, []);

  const openWindow = (opener: HTMLElement) => {
    caughtRef.current = true;
    setCaught(true);
    wm.open('petak', opener);
  };

  // A mouse catch counts on pointerdown (mockup-validated): waiting for click would lose the catch
  // whenever the icon darts off between press and release.
  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    swallowClickRef.current = false;
    if (e.pointerType === 'touch' || e.button !== 0 || caughtRef.current || prefersReducedMotion()) return;
    e.preventDefault(); // no mousedown focus: it would pull focus back out of the window this may open
    swallowClickRef.current = true;
    const next = catchesRef.current + 1;
    catchesRef.current = next;
    setCatches(next);
    if (next >= CATCHES_TO_OPEN) {
      openWindow(e.currentTarget);
    } else {
      coolRef.current = 0; // no breather after a hit: it panics
      hop(e.currentTarget, e.clientX, e.clientY);
    }
  };

  // Every other path opens directly: keyboard (detail 0), touch tap, reduced motion, already caught.
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (e.detail !== 0 && swallowClickRef.current) {
      swallowClickRef.current = false; // this click belongs to a catch already counted on pointerdown
      return;
    }
    openWindow(e.currentTarget);
  };

  const showCounter = (fled || catches > 0) && !caught;
  return (
    <>
      <button ref={ref} type="button" className="icon petak" onPointerDown={onPointerDown} onClick={onClick}>
        <span className="tile">{GLYPHS.petak}</span>
        <span className="lbl">Petak Umpet</span>
      </button>
      <div id="counter" ref={counterRef} role="status" aria-live="polite" hidden={!showCounter}>
        {`tangkap dia: ${catches}/${CATCHES_TO_OPEN}`}
      </div>
    </>
  );
}
