import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BOT_COMMANDS, botGreeting, botReply, type BotMessage } from './bot-replies';
import { prefersReducedMotion } from '@/lib/motion';
import { getAppDef } from '@/os/app-registry';
import { useWM } from '@/os/WindowManagerContext';
import './bot.css';

interface Entry { from: 'bot' | 'me'; msg: BotMessage }

const TYPING_MS = 600;

export default function BotApp() {
  const wm = useWM();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const msgsRef = useRef<HTMLDivElement>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const aliveRef = useRef(true);
  const greetedRef = useRef(false);

  // keep the newest message in view (scrollTop, not scrollTo: jsdom has no Element.scrollTo)
  useEffect(() => {
    const el = msgsRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries, typing]);

  const say = (msgs: BotMessage[]) => {
    const add = (msg: BotMessage) => setEntries((prev) => [...prev, { from: 'bot', msg }]);
    if (prefersReducedMotion()) {
      // no typing indicator, no pacing: every message lands at once
      msgs.forEach(add);
      return;
    }
    for (const msg of msgs) {
      queueRef.current = queueRef.current.then(async () => {
        if (!aliveRef.current) return;
        setTyping(true);
        await new Promise((r) => setTimeout(r, TYPING_MS));
        if (!aliveRef.current) return;
        setTyping(false);
        add(msg);
      });
    }
  };

  useEffect(() => {
    // StrictMode runs this twice (mount, cleanup, mount): re-arm aliveRef on every mount,
    // and greet through a ref guard so the visitor is greeted exactly once
    aliveRef.current = true;
    if (!greetedRef.current) {
      greetedRef.current = true;
      say([botGreeting()]);
    }
    return () => { aliveRef.current = false; };
  }, []);

  const ask = (text: string) => {
    if (!text.trim()) return;
    setEntries((prev) => [...prev, { from: 'me', msg: { text } }]);
    say(botReply(text));
  };

  const onSubmit = (e: FormEvent) => { e.preventDefault(); ask(input); setInput(''); };

  return (
    <div className="bot">
      <div className="msgs" ref={msgsRef} role="log" aria-live="polite" aria-label="Chat with Ezra Bot">
        {entries.map((en, i) => {
          const action = en.msg.action;
          return (
            <div key={i} className={`m${en.from === 'me' ? ' me' : ''}`}>
              {en.from === 'bot' && <span className="av" aria-hidden="true">EB</span>}
              <div className="bub">
                {en.msg.text}
                {/* an action pointing at an app that isn't registered yet is hidden, not a dead button */}
                {action && getAppDef(action.open) && (
                  <button type="button" className="inl"
                    onClick={(e) => wm.open(action.open, e.currentTarget)}>
                    {action.label}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {typing && (
          <div className="m typing" aria-hidden="true">
            <span className="av">EB</span><span className="bub"><i /><i /><i /></span>
          </div>
        )}
      </div>
      <div className="chips" role="group" aria-label="Ask Ezra Bot">
        {BOT_COMMANDS.map((c) => (
          <button key={c} type="button" className="chip" onClick={() => ask(c)}>{c}</button>
        ))}
      </div>
      <form className="ask" onSubmit={onSubmit}>
        <input value={input} onChange={(e) => setInput(e.target.value)}
          aria-label="Message Ezra Bot" placeholder="ketik di sini…"
          autoComplete="off" spellCheck={false} />
        <button type="submit">kirim</button>
      </form>
    </div>
  );
}
