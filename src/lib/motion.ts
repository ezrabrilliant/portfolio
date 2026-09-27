import { gsap } from 'gsap';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Window-open snap: scale/opacity, 150ms. Instant under reduced motion. */
export function snapIn(el: Element): void {
  if (prefersReducedMotion()) {
    gsap.set(el, { scale: 1, opacity: 1 });
    return;
  }
  gsap.fromTo(el, { scale: 0.94, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.15, ease: 'power2.out' });
}
