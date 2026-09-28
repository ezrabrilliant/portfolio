import { getCaseStudy } from '@/config/os-content';
import './about.css';

export default function PetakWindow() {
  const c = getCaseStudy('petak-umpet');
  if (!c) return <article className="case"><p className="meta">file not found.</p></article>;
  const play = c.links.find((l) => l.href.includes('roblox.com'));
  return (
    <article className="case petakwin">
      <p className="lead">{c.metric ? `Petak Umpet — Roblox, ${c.metric}.` : 'Petak Umpet — Roblox.'}</p>
      <p className="joke">Kamu memang jago cari yang ngumpet.</p>
      <p>{c.description}</p>
      <p>{c.techSentence}</p>
      {play && (
        <p className="links">
          <a href={play.href} target="_blank" rel="noopener noreferrer">Play Petak Umpet on Roblox</a>
        </p>
      )}
    </article>
  );
}
