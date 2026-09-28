import { useSyncExternalStore } from 'react';

const QUERIES = ['(max-width: 767.98px)', '(hover: none) and (pointer: coarse)'];

function subscribe(onChange: () => void): () => void {
  const lists = QUERIES.map((q) => window.matchMedia(q));
  for (const l of lists) l.addEventListener('change', onChange);
  return () => { for (const l of lists) l.removeEventListener('change', onChange); };
}

function snapshot(): boolean {
  return QUERIES.some((q) => window.matchMedia(q).matches);
}

/** Phone-OS mode (spec §2.4): width < 768px or a touch-only pointer. */
export function usePhoneMode(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
