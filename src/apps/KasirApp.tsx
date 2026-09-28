import { useEffect, useRef, useState } from 'react';
import emailjs from '@emailjs/browser';
import { buildReceipt, wibStamp, type ReceiptItem } from './receipt';
import { contactItem, messageItem, projectsItem, resumeItem } from './kasir-items';
import './kasir.css';

type ItemKey = 'contact' | 'projects' | 'resume' | 'message';

const MENU: { k: ItemKey; n: string; d: string }[] = [
  { k: 'contact', n: 'Contact card', d: 'email, GitHub, LinkedIn' },
  { k: 'projects', n: 'Project list', d: 'five systems with their numbers' },
  { k: 'resume', n: 'Resume', d: 'study, training, full CV (PDF)' },
  { k: 'message', n: 'Kirim pesan', d: 'tulis pesan, terkirim ke email Ezra' },
];

/** true only when EmailJS confirmed the send; missing keys, offline and service errors are all false. */
async function sendMessage(form: { name: string; email: string; message: string }): Promise<boolean> {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
  if (!serviceId || !templateId || !publicKey) return false;
  try {
    await emailjs.send(serviceId, templateId, {
      from_name: form.name,
      from_email: form.email,
      subject: 'EzraOS Kasir',
      message: form.message,
    }, publicKey);
    return true;
  } catch {
    return false;
  }
}

export default function KasirApp() {
  const [picked, setPicked] = useState<Set<ItemKey>>(new Set());
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [receipt, setReceipt] = useState('');
  const [orderNo, setOrderNo] = useState(0);
  const [busy, setBusy] = useState(false);
  // Order switches the window to the receipt: the menu + form collapse so the receipt is never squeezed
  // out of a short window (final review F4). "new order" switches back with picks and form intact.
  const [showReceipt, setShowReceipt] = useState(false);
  const receiptRef = useRef<HTMLPreElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const backToMenu = useRef(false);
  // a second click can land before the disabled state renders; the ref blocks a duplicate send
  const busyRef = useRef(false);

  const toggle = (k: ItemKey) => setPicked((prev) => {
    const next = new Set(prev);
    if (next.has(k)) next.delete(k); else next.add(k);
    return next;
  });

  const messageReady = !picked.has('message')
    || (form.name.trim() !== '' && form.email.trim() !== '' && form.message.trim() !== '');
  const canOrder = picked.size > 0 && messageReady && !busy;

  const order = async () => {
    if (!canOrder || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setShowReceipt(true);
    const items: ReceiptItem[] = [];
    if (picked.has('contact')) items.push(contactItem());
    if (picked.has('projects')) items.push(projectsItem());
    if (picked.has('resume')) items.push(resumeItem());
    if (picked.has('message')) {
      const sent = await sendMessage(form);
      items.push(messageItem(sent));
      // a sent message is cleared so a second Order cannot resend it; a failed one stays for a retry
      if (sent) setForm((f) => ({ ...f, message: '' }));
    }
    const no = orderNo + 1;
    setOrderNo(no);
    setReceipt(buildReceipt({ orderNo: no, stamp: wibStamp(new Date()), items }));
    busyRef.current = false;
    setBusy(false);
  };

  // the Order / new order button that had focus is gone after the switch: hand focus to what replaced it
  useEffect(() => {
    if (showReceipt && !busy) receiptRef.current?.focus({ preventScroll: true });
  }, [showReceipt, busy, orderNo]);
  useEffect(() => {
    if (!showReceipt && backToMenu.current) {
      backToMenu.current = false;
      firstItemRef.current?.focus({ preventScroll: true });
    }
  }, [showReceipt]);

  const newOrder = () => {
    backToMenu.current = true;
    setShowReceipt(false);
  };

  const save = () => {
    const a = document.createElement('a');
    a.href = `data:text/plain;charset=utf-8,${encodeURIComponent(receipt + '\n')}`;
    a.download = `ezraos-receipt-${String(orderNo).padStart(4, '0')}.txt`;
    document.body.append(a);
    a.click();
    a.remove();
  };

  return (
    <div className="kasir">
      {!showReceipt && (
        <>
          <div className="kmenu" role="group" aria-label="Menu">
            {MENU.map((i, idx) => (
              <button key={i.k} ref={idx === 0 ? firstItemRef : undefined} type="button" className="kitem"
                aria-pressed={picked.has(i.k)} onClick={() => toggle(i.k)}>
                <span className="box" aria-hidden="true">{picked.has(i.k) ? '[x]' : '[ ]'}</span>
                <span className="kn">{i.n}</span>
                <span className="kd">{i.d} — Rp 0</span>
              </button>
            ))}
          </div>
          {picked.has('message') && (
            <div className="kform">
              <label>nama<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" /></label>
              <label>email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" /></label>
              <label>pesan<textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></label>
            </div>
          )}
        </>
      )}
      <div className="kact">
        {showReceipt ? (
          <>
            <button type="button" className="kbtn" disabled={busy} onClick={newOrder}>new order</button>
            <button type="button" className="kbtn alt" disabled={busy || !receipt} onClick={save}>save receipt</button>
          </>
        ) : (
          <button type="button" className="kbtn" disabled={!canOrder} onClick={order}>Order</button>
        )}
      </div>
      <div className="rwrap" aria-live="polite">
        {busy
          ? <p className="khint">mencetak struk...</p>
          : showReceipt && receipt
            ? <pre ref={receiptRef} className="rcpt" tabIndex={0} aria-label={`Receipt number ${orderNo}`}>{receipt}</pre>
            : <p className="khint">pick from the menu, then Order. semuanya gratis.</p>}
      </div>
    </div>
  );
}
