import { useEffect } from 'react';
import { Desktop } from './Desktop';
import { Dock } from './Dock';
import { MenuBar } from './MenuBar';
import { usePhoneMode } from './usePhoneMode';
import { useWM } from './WindowManagerContext';

export function EzraOS() {
  const wm = useWM();
  const phone = usePhoneMode();
  useEffect(() => {
    document.body.classList.toggle('phone', phone);
    return () => document.body.classList.remove('phone');
  }, [phone]);

  // Phone has no dock (and no minimize button), so a window minimized on desktop before the
  // viewport flipped would be unreachable: bring every minimized window back.
  const { state, restore } = wm;
  useEffect(() => {
    if (!phone) return;
    for (const w of state.windows) if (w.minimized) restore(w.id);
  }, [phone, state.windows, restore]);

  return (
    <div id="os">
      <MenuBar />
      <Desktop />
      {!phone && <Dock />}
    </div>
  );
}
