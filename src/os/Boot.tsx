import { useCallback, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { getProjectCount } from '@/config/os-content';
import { prefersReducedMotion } from '@/lib/motion';

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

export function Boot({ onDone }: { onDone: () => void }) {
  const logRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
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

    const skip = (e: Event) => { e.preventDefault(); tl.kill(); finish(); };
    window.addEventListener('keydown', skip, true);
    window.addEventListener('pointerdown', skip, true);
    return () => {
      tl.kill();
      window.removeEventListener('keydown', skip, true);
      window.removeEventListener('pointerdown', skip, true);
    };
  }, [finish]);

  if (prefersReducedMotion()) return null;

  return (
    <div id="boot" ref={rootRef} className="dark" aria-label="EzraOS is starting. Press any key or click to skip.">
      <div ref={logRef} aria-hidden="true" />
      <div className="skip">press any key to skip</div>
    </div>
  );
}
