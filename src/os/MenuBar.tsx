import { useEffect, useState } from 'react';
import { useWM } from './WindowManagerContext';
import { usePhoneMode } from './usePhoneMode';

const wibFmt = new Intl.DateTimeFormat('en-GB', {
  // hourCycle, not hour12:false — some ICU builds map hour12:false to h24 and print midnight as "24:00"
  timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

// pure formatter co-located with its only consumer by design; fast-refresh falls back to a full reload for this file
// eslint-disable-next-line react-refresh/only-export-components
export function formatWib(d: Date): string {
  return `${wibFmt.format(d)} WIB`;
}

export function MenuBar() {
  const wm = useWM();
  const phone = usePhoneMode();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // tick on the minute boundary, then every minute (spec §2.2)
    let interval: ReturnType<typeof setInterval> | undefined;
    const align = setTimeout(() => {
      setNow(new Date());
      interval = setInterval(() => setNow(new Date()), 60_000);
    }, 60_000 - (Date.now() % 60_000));
    return () => { clearTimeout(align); if (interval) clearInterval(interval); };
  }, []);

  return (
    <header id="menubar" className="dark">
      <button type="button" onClick={(e) => wm.open('about', e.currentTarget)}>About EzraOS</button>
      <div className="right">
        <span aria-label="Local time in Surabaya">{formatWib(now)}</span>
        {/* phone: dropped so clock + location fit a 360px status bar (~419px of mono text otherwise) */}
        {!phone && <span>all systems live</span>}
        <span>Surabaya, ID</span>
      </div>
    </header>
  );
}
