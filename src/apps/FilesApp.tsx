import { useState } from 'react';
import { getCaseStudy, getFoldersByYear } from '@/config/os-content';
import { useWM } from '@/os/WindowManagerContext';
import './files.css';

const folderSvg = <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 8h9l3 3h12v15H4z" /></svg>;
const fileSvg = <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 4h11l5 5v19H8z" /><path d="M19 4v5h5M12 16h8M12 20h8" /></svg>;
const upSvg = <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 26V8M9 15l7-7 7 7" /></svg>;

export default function FilesApp() {
  const wm = useWM();
  const [dir, setDir] = useState<number | null>(null);
  const folders = getFoldersByYear();
  const current = folders.find((f) => f.year === dir);

  return (
    <div className="files">
      <div className="path">{dir === null ? '/projects' : `/projects/${dir}`}</div>
      <ul aria-label="Folder contents">
        {current === undefined
          ? folders.map((f) => (
              <li key={f.year}>
                <button type="button" className="row" aria-label={`open folder ${f.year}`} onClick={() => setDir(f.year)}>
                  {folderSvg}
                  <span className="n">{f.year}</span>
                  <span className="x">{f.slugs.length} file{f.slugs.length === 1 ? '' : 's'}</span>
                </button>
              </li>
            ))
          : [
              <li key="up">
                <button type="button" className="row" aria-label="back to /projects" onClick={() => setDir(null)}>
                  {upSvg}
                  <span className="n">..</span>
                  <span className="x">back to /projects</span>
                </button>
              </li>,
              ...current.slugs.map((slug) => {
                const c = getCaseStudy(slug);
                return (
                  <li key={slug}>
                    <button type="button" className="row" aria-label={`open ${slug}.case`}
                      onClick={(e) => wm.open(`case:${slug}`, e.currentTarget)}>
                      {fileSvg}
                      <span className="n">{slug}.case</span>
                      <span className="x">{c && c.status !== 'completed' ? c.status : ''}</span>
                    </button>
                  </li>
                );
              }),
            ]}
      </ul>
    </div>
  );
}
