import type { ReactNode } from 'react';

/* Hand-drawn glyphs from the validated mockup. All aria-hidden; labels live on the buttons. */
export const GLYPHS: Record<'bot' | 'monitor' | 'market' | 'files' | 'terminal' | 'kasir' | 'petak', ReactNode> = {
  bot: <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 6h24v16H15l-6 5v-5H4z" /><path d="M11 12v3M21 12v3" /></svg>,
  monitor: <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 5h24v18H4z" /><path d="M8 18l4-5 4 3 4-6 4 4" /><path d="M11 27h10M16 23v4" /></svg>,
  market: <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9 6v20M16 4v15M23 10v17" /><path className="f" d="M6.5 11h5v9h-5zM13.5 7h5v7h-5zM20.5 15h5v8h-5z" /></svg>,
  files: <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 8h9l3 3h12v15H4z" /><path d="M4 14h24" /></svg>,
  terminal: <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 6h24v20H4z" /><path d="M9 12l4 3.5L9 19M16 20h7" /></svg>,
  kasir: <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 4h16v24l-3-2-2.5 2-2.5-2-2.5 2-2.5-2-3 2z" /><path d="M12 10h8M12 14h8M12 18h5" /></svg>,
  petak: <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 18h24v10H4zM4 23h24M12 18v5M20 23v5" /><circle cx="11" cy="12" r="3.5" /><circle cx="21" cy="12" r="3.5" /><circle className="k" cx="12" cy="12.5" r="1.4" /><circle className="k" cx="22" cy="12.5" r="1.4" /></svg>,
};
