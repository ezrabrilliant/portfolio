import { getLiveSystems } from '@/config/os-content';
import { useWM } from '@/os/WindowManagerContext';
// .lamp styles live in about.css; Monitor may open before any About/Case window has loaded it
import './about.css';
import './monitor.css';

export default function MonitorApp() {
  const wm = useWM();
  const systems = getLiveSystems();
  const live = systems.filter((s) => s.status === 'live').length;
  const shipped = systems.length - live;
  return (
    <div className="mon">
      <table>
        <thead>
          <tr><th scope="col">Process</th><th scope="col">What</th><th scope="col">Metric</th><th scope="col">Status</th></tr>
        </thead>
        <tbody>
          {systems.map((s) => (
            <tr key={s.proc}>
              <td>
                <button type="button" className="proc" aria-label={`${s.proc}, open ${s.name} case`}
                  onClick={(e) => wm.open(`case:${s.slug}`, e.currentTarget)}>
                  {s.proc}
                </button>
              </td>
              <td className="what">{s.what}</td>
              <td>{s.metric}</td>
              <td className="st"><span className={`lamp on ${s.status}`} aria-hidden="true" />{s.status}</td>
            </tr>
          ))}
          {/* slot for upcoming deployments: dimmed, non-interactive, never names an employer */}
          <tr className="dim">
            <td>next-system</td>
            <td className="what">—</td>
            <td>—</td>
            <td className="st"><span className="lamp" aria-hidden="true" />deploying soon</td>
          </tr>
        </tbody>
      </table>
      <p className="foot">{`${systems.length} systems, ${live} live, ${shipped} shipped`}</p>
    </div>
  );
}
