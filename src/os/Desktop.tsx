import { useEffect, useRef, useState } from 'react';
import { DesktopIcon } from './DesktopIcon';
import { GLYPHS } from './icons';
import { PetakIcon } from './PetakIcon';
import { WindowFrame } from './WindowFrame';
import { focusedId } from './window-manager';
import { getAppDef } from './app-registry';
import { useWM } from './WindowManagerContext';
import { usePhoneMode } from './usePhoneMode';
import { petakTapAction } from '@/apps/petak-flee';
import { prefersReducedMotion } from '@/lib/motion';

const ICONS: { app: keyof typeof GLYPHS; label: string }[] = [
  { app: 'bot', label: 'Bot' },
  { app: 'monitor', label: 'Monitor' },
  { app: 'market', label: 'Market' },
  { app: 'files', label: 'Files' },
  { app: 'terminal', label: 'Terminal' },
  { app: 'kasir', label: 'Kasir' },
];

// Phone grid slots (CSS `order`): home icons sit on even orders 2, 4, … 12, so every odd order
// 1, 3, … 13 is a gap between (or before/after) them — a free slot for Petak to hop into.
const iconOrder = (index: number) => 2 * (index + 1);
const PETAK_SLOTS = Array.from({ length: ICONS.length + 1 }, (_, i) => 2 * i + 1);
const PETAK_HOME_SLOT = PETAK_SLOTS[PETAK_SLOTS.length - 1]; // after the last icon

/**
 * Petak on the phone home screen (spec §2.4): touch has no hover to flee from, so each tap
 * hops it to a different grid slot and the 3rd tap opens it (reduced motion: the 1st).
 * Keyboard activation opens directly, as on desktop.
 */
function PetakPhoneIcon() {
  const wm = useWM();
  const [taps, setTaps] = useState(0);
  const [slot, setSlot] = useState(PETAK_HOME_SLOT);
  return (
    <button type="button" className="icon petak" data-app="petak" style={{ order: slot }}
      onClick={(e) => {
        if (e.detail === 0) { wm.open('petak', e.currentTarget); return; } // keyboard: no hop game
        const next = taps + 1;
        setTaps(next);
        if (petakTapAction(next, prefersReducedMotion()) === 'open') {
          setTaps(0); // after open → back, the hop game replays from tap 1
          wm.open('petak', e.currentTarget);
        } else {
          const free = PETAK_SLOTS.filter((s) => s !== slot);
          setSlot(free[Math.floor(Math.random() * free.length)]); // hop to a different free grid position
        }
      }}>
      <span className="tile">{GLYPHS.petak}</span>
      <span className="lbl">Petak Umpet</span>
    </button>
  );
}

export function Desktop() {
  const wm = useWM();
  const phone = usePhoneMode();
  const [selected, setSelected] = useState<string | null>(null);
  const focused = focusedId(wm.state);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // e.code covers layouts where backtick is a dead key (US-International reports e.key === 'Dead')
      if (e.ctrlKey && (e.key === '`' || e.code === 'Backquote')) {
        e.preventDefault();
        wm.cycle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [wm]);

  // default state after boot: the Bot greets first-time visitors (spec §2.2).
  // Desktop mounts once, after Boot calls onDone. The ref (not a [wm] dependency — wm changes on every
  // state update) keeps StrictMode's double effect and later re-renders from re-opening a closed Bot.
  const openedBot = useRef(false);
  useEffect(() => {
    if (!openedBot.current) {
      openedBot.current = true;
      wm.open('bot');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openApp = (id: string, opener: HTMLElement) => {
    if (!getAppDef(id)) return; // unknown app: safe no-op
    wm.open(id, opener);
  };

  return (
    <main id="desk" aria-label="Desktop" onPointerDown={(e) => {
      if (!(e.target as HTMLElement).closest('.icon, .win')) setSelected(null);
    }}>
      <div id="icons" className="dark">
        <div className="icon-col">
          {ICONS.map((i, idx) => (
            <DesktopIcon key={i.app} app={i.app} label={i.label}
              selected={selected === i.app}
              onSelect={() => { setSelected(i.app); }}
              onOpen={(el) => openApp(i.app, el)}
              tapOpens={phone}
              order={phone ? iconOrder(idx) : undefined} />
          ))}
        </div>
        {phone ? <PetakPhoneIcon /> : <PetakIcon />}
      </div>
      <div id="wins">
        {wm.state.windows.map((w) => {
          const def = getAppDef(w.id);
          if (!def) return null;
          return (
            <WindowFrame key={w.id} id={w.id} title={def.title}
              width={def.width} height={def.height}
              x={w.x} y={w.y} z={w.z} minimized={w.minimized}
              focused={focused === w.id}>
              {def.render()}
            </WindowFrame>
          );
        })}
      </div>
    </main>
  );
}
