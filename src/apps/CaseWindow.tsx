import { getCaseStudy } from '@/config/os-content';
import './about.css';

export default function CaseWindow({ slug }: { slug: string }) {
  const c = getCaseStudy(slug);
  if (!c) {
    return (
      <article className="case">
        <p className="meta">file not found — this entry no longer exists in /projects.</p>
      </article>
    );
  }
  const showStatus = c.status !== 'completed';
  return (
    <article className="case">
      <h3>{c.title}</h3>
      <p className="meta">
        {showStatus && <span className={`lamp on ${c.status}`} aria-hidden="true" />}
        {showStatus ? `${c.status}, ${c.year}` : c.year}
      </p>
      {c.metric && <p className="metric" data-testid="metric">{c.metric}</p>}
      <p>{c.description}</p>
      <p>{c.techSentence}</p>
      {c.links.length > 0 && (
        <p className="links">
          {c.links.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>
          ))}
        </p>
      )}
    </article>
  );
}
