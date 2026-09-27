import { useEffect, useState } from 'react';
import { DesktopIcon } from './DesktopIcon';
import { GLYPHS } from './icons';
import { WindowFrame } from './WindowFrame';
import { focusedId } from './window-manager';
import { getAppDef } from './app-registry';
import { useWM } from './WindowManagerContext';

const ICONS: { app: keyof typeof GLYPHS; label: string }[] = [
  { app: 'bot', label: 'Bot' },
  { app: 'monitor', label: 'Monitor' },
  { app: 'market', label: 'Market' },
  { app: 'files', label: 'Files' },
  { app: 'terminal', label: 'Terminal' },
  { app: 'kasir', label: 'Kasir' },
];

export function Desktop() {
  const wm = useWM();
  const [selected, setSelected] = useState<string | null>(null);
  const focused = focusedId(wm.state);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        wm.cycle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [wm]);

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
          {ICONS.map((i) => (
            <DesktopIcon key={i.app} app={i.app} label={i.label}
              selected={selected === i.app}
              onSelect={() => setSelected(i.app)}
              onOpen={(el) => openApp(i.app, el)} />
          ))}
        </div>
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
