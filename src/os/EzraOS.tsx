import { useEffect } from 'react';
import { Desktop } from './Desktop';
import { Dock } from './Dock';
import { MenuBar } from './MenuBar';
import { usePhoneMode } from './usePhoneMode';

export function EzraOS() {
  const phone = usePhoneMode();
  useEffect(() => {
    document.body.classList.toggle('phone', phone);
    return () => document.body.classList.remove('phone');
  }, [phone]);
  return (
    <div id="os">
      <MenuBar />
      <Desktop />
      {!phone && <Dock />}
    </div>
  );
}
