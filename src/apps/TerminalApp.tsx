import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { runCommand } from './terminal-commands';
import { usePhoneMode } from '@/os/usePhoneMode';
import './terminal.css';

const PS = 'ezra@ezraos:~$';

export default function TerminalApp() {
  const [lines, setLines] = useState<string[]>(['EzraOS terminal. type help to see what it knows.']);
  const [input, setInput] = useState('');
  const histRef = useRef<string[]>([]);
  const hiRef = useRef(0);
  const termRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const phone = usePhoneMode();

  // the prompt is ready to type into when the window opens. WindowFrame focuses the window itself
  // only when focus is outside it, so focusing the input here is not undone. Skip if this window
  // is not the active one (it may have mounted behind another window). Not on phone: focusing an
  // input there pops the virtual keyboard over the output before the visitor asked to type.
  useEffect(() => {
    if (phone) return;
    const win = inputRef.current?.closest('.win');
    if (!win || win.classList.contains('active')) inputRef.current?.focus({ preventScroll: true });
    // open-time only: a later phone/desktop flip must not pull focus into the prompt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep the prompt in view; scrolls .term only, never the page (scrollTop: jsdom has no Element.scrollTo)
  useEffect(() => {
    const el = termRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const run = (raw: string) => {
    const echoed = `${PS} ${raw}`;
    const cmd = raw.trim();
    if (!cmd) { setLines((p) => [...p, echoed]); return; }
    histRef.current.push(cmd);
    hiRef.current = histRef.current.length;
    const res = runCommand(cmd);
    setLines((p) => (res.clear ? [] : [...p, echoed, ...(res.output ? [res.output] : [])]));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const hist = histRef.current;
    if (e.key === 'Enter') {
      run(input);
      setInput('');
    } else if (e.key === 'ArrowUp' && hist.length) {
      e.preventDefault();
      hiRef.current = Math.max(0, hiRef.current - 1);
      setInput(hist[hiRef.current]);
    } else if (e.key === 'ArrowDown' && hist.length) {
      e.preventDefault();
      hiRef.current = Math.min(hist.length, hiRef.current + 1);
      setInput(hist[hiRef.current] ?? '');
    }
    // Tab and Escape fall through to WindowFrame (focus containment, close)
  };

  return (
    <div className="term dark" ref={termRef}
      onClick={(e) => {
        // clicking anywhere in the terminal returns to the prompt, unless the visitor is selecting text
        if (!(e.target as HTMLElement).closest('a, input') && !String(getSelection())) {
          inputRef.current?.focus({ preventScroll: true });
        }
      }}>
      <div role="log" aria-live="polite" aria-label="Terminal output">
        {lines.map((l, i) => <div key={i} className="o">{l}</div>)}
      </div>
      <label className="line">
        <span className="ps" aria-hidden="true">{PS}</span>
        <input ref={inputRef} className="tin" type="text" value={input}
          onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown}
          aria-label="Terminal command" autoComplete="off" autoCapitalize="off"
          autoCorrect="off" spellCheck={false} />
      </label>
    </div>
  );
}
