import { getMarketList } from '@/config/os-content';
import { useWM } from '@/os/WindowManagerContext';
import './market.css';

/** Deterministic decorative polyline — shape only, no axis, no numbers implied (spec §2.3.3). */
// exported beside the component because the test contract imports it from here; fast-refresh falls back to a full reload
// eslint-disable-next-line react-refresh/only-export-components
export function sparkPoints(slug: string): string {
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) % 997;
  const pts: string[] = [];
  for (let i = 0; i < 12; i++) {
    h = (h * 131 + 7) % 997;
    pts.push(`${i * 6},${18 - (h % 14)}`);
  }
  return pts.join(' ');
}

export default function MarketApp() {
  const wm = useWM();
  const assets = getMarketList();
  return (
    <div className="market">
      <p className="mkhead">EZRA Exchange — {assets.length} listed assets. Not prices; just proof of shipping.</p>
      <ul aria-label="Listed assets">
        {assets.map((c) => (
          <li key={c.slug}>
            <button type="button" className="asset" aria-label={`open ${c.title} case`}
              onClick={(e) => wm.open(`case:${c.slug}`, e.currentTarget)}>
              <span className="tk">{c.slug}</span>
              <span className="nm">{c.title}</span>
              <span className="mt">{c.metric ?? String(c.year)}</span>
              <svg className="spark" viewBox="0 0 66 20" aria-hidden="true" focusable="false">
                <polyline points={sparkPoints(c.slug)} />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
