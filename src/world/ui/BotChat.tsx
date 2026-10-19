import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import emailjs from "@emailjs/browser";
import { playJingle, playSfx } from "@/world/engine/audio/sfx";
import { sharedKeyboard } from "@/world/input/keyboard";
import { resetTouch } from "@/world/input/touch";
import { useWorld } from "@/world/state/store";
import { SUGGESTIONS, botReply, type BotReply } from "./botAnswers";

type Line = { from: "you" | "bot"; text: string; reply?: BotReply };
type Send = "idle" | "sending" | "sent" | "error";

/** Seconds Ezra Bot "types" before it answers. */
const TYPING_MS = 650;

/**
 * Ezra Bot's chat (polish 2B), opened from the robot ("Ask Ezra Bot"): quick questions or your own, answered from the
 * portfolio's data (botAnswers.ts), and a contact form sent through EmailJS. Keys go to the chat while it is open; Esc
 * or the close button leaves.
 */
export function BotChat() {
  const open = useWorld((s) => s.botOpen);
  const setOpen = useWorld((s) => s.setBotOpen);
  const [lines, setLines] = useState<Line[]>([{ from: "bot", text: "Hi! I'm Ezra Bot. Ask me about Ezra and the things he builds." }]);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [form, setForm] = useState(false);
  const [mail, setMail] = useState({ name: "", email: "", message: "" });
  const [send, setSend] = useState<Send>("idle");
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  // the chat sweeps open with the bot's hello, and closes mirrored
  useEffect(() => {
    if (!open) return;
    playSfx("uiOpen");
    playSfx("chat", { delay: 0.12 });
    return () => playSfx("uiClose");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    sharedKeyboard.release();
    resetTouch();
    input.current?.focus({ preventScroll: true });
    // keys belong to the chat: the world's listeners (window, bubble) never see them
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
      e.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, setOpen]);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [lines, typing, form]);

  if (!open) return null;

  const ask = (q: string) => {
    const text = q.trim();
    if (!text || typing) return;
    setLines((l) => [...l, { from: "you", text }]);
    playSfx("send");
    setDraft("");
    setTyping(true);
    window.setTimeout(() => {
      const reply = botReply(text);
      setLines((l) => [...l, { from: "bot", text: reply.text, reply }]);
      setTyping(false);
      playSfx("chat");
      if (reply.contact) {
        setForm(true);
        playSfx("uiOpen", { delay: 0.15, volume: 0.7 });
      }
    }, TYPING_MS);
  };
  const typeInto = (next: typeof mail) => {
    playSfx("type");
    setMail(next);
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const service = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const template = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const key = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
    if (!service || !template || !key) {
      setSend("error");
      playSfx("error");
      return;
    }
    setSend("sending");
    try {
      await emailjs.send(service, template, { from_name: mail.name, from_email: mail.email, subject: "From the voxel world (Ezra Bot)", message: mail.message }, key);
      setSend("sent");
      setMail({ name: "", email: "", message: "" });
      setLines((l) => [...l, { from: "bot", text: "Sent! Ezra will write back to your email." }]);
      setForm(false);
      playJingle("sent");
    } catch {
      setSend("error");
      playSfx("error");
    }
  };

  return (
    <div className="bot-overlay" role="dialog" aria-modal="true" aria-label="Chat with Ezra Bot" onPointerDown={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div className="bot-card">
        <header className="bot-head">
          <span className="bot-avatar" aria-hidden="true" />
          <span className="bot-name">Ezra Bot</span>
          <span className="bot-tag">BOT</span>
          <button type="button" className="bot-close" onClick={() => setOpen(false)} aria-label="Close the chat">
            ×
          </button>
        </header>
        <div className="bot-lines" ref={list} aria-live="polite">
          {lines.map((l, i) => (
            <div key={i} className={l.from === "you" ? "bot-line bot-line--you" : "bot-line"}>
              <p>{l.text}</p>
              {l.reply?.link && (
                <a className="bot-link" href={l.reply.link.href} target="_blank" rel="noreferrer">
                  {l.reply.link.label} ↗
                </a>
              )}
            </div>
          ))}
          {typing && (
            <div className="bot-line bot-typing" aria-label="Ezra Bot is typing">
              <span />
              <span />
              <span />
            </div>
          )}
          {form && (
            <form className="bot-form" onSubmit={submit}>
              <label>
                Your name
                <input id="bot-name" required value={mail.name} onChange={(e) => typeInto({ ...mail, name: e.target.value })} />
              </label>
              <label>
                Your email
                <input id="bot-email" type="email" required value={mail.email} onChange={(e) => typeInto({ ...mail, email: e.target.value })} />
              </label>
              <label>
                Message
                <textarea id="bot-message" required rows={3} value={mail.message} onChange={(e) => typeInto({ ...mail, message: e.target.value })} />
              </label>
              <button type="submit" className="bot-send" disabled={send === "sending"}>
                {send === "sending" ? "Sending…" : "Send to Ezra"}
              </button>
              {send === "error" && <p className="bot-error">That didn't go through. Try again, or email {"ezrakonterliem@gmail.com"}.</p>}
            </form>
          )}
        </div>
        <div className="bot-chips">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="bot-chip" onClick={() => ask(s)}>
              {s}
            </button>
          ))}
        </div>
        <form
          className="bot-ask"
          onSubmit={(e) => {
            e.preventDefault();
            ask(draft);
          }}
        >
          <input id="bot-ask" ref={input} value={draft} onChange={(e) => {
              // typing: a tiny tick per key (sfx.ts spaces them out)
              playSfx("type");
              setDraft(e.target.value);
            }} placeholder="Ask about Ezra or a project…" aria-label="Your question" autoComplete="off" />
          <button type="submit" aria-label="Send">
            ➤
          </button>
        </form>
      </div>
    </div>
  );
}
