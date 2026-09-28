export const RECEIPT_WIDTH = 40;

export interface ReceiptItem { name: string; detail: string[] }

/** Item details print under a 3-space indent, so each detail has this many columns. */
export const DETAIL_WIDTH = RECEIPT_WIDTH - 3;

const line = (ch: string) => ch.repeat(RECEIPT_WIDTH);
const center = (s: string) => ' '.repeat(Math.max(0, Math.floor((RECEIPT_WIDTH - s.length) / 2))) + s;
const lr = (l: string, r: string) => l + ' '.repeat(Math.max(1, RECEIPT_WIDTH - l.length - r.length)) + r;

/** Word-wraps text to `width` columns; a single word longer than the width is hard-cut. */
export function wrap(text: string, width: number): string[] {
  width = Math.max(1, Math.floor(width)); // width <= 0 would never shrink a word and loop forever
  const out: string[] = [];
  let cur = '';
  for (let word of text.split(/\s+/).filter(Boolean)) {
    while (word.length > width) {
      if (cur) { out.push(cur); cur = ''; }
      out.push(word.slice(0, width));
      word = word.slice(width);
    }
    if (!word) continue;
    if (!cur) cur = word;
    else if (cur.length + 1 + word.length <= width) cur += ` ${word}`;
    else { out.push(cur); cur = word; }
  }
  if (cur) out.push(cur);
  return out.length ? out : [''];
}

/** Keeps a detail line's own leading indent and wraps the rest, so the tape never overflows. */
function fitDetail(d: string): string[] {
  if (d.length <= DETAIL_WIDTH) return [d];
  const indent = d.match(/^\s*/)![0];
  return wrap(d.slice(indent.length), DETAIL_WIDTH - indent.length).map((w) => indent + w);
}

export function wibStamp(d: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23', // hour12:false renders midnight as 24 on some ICU builds
    }).formatToParts(d).map((p) => [p.type, p.value]),
  );
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute} WIB`;
}

export function buildReceipt(opts: { orderNo: number; stamp: string; items: ReceiptItem[] }): string {
  const rows = [
    center('EZRAOS KASIR'),
    center('Surabaya, ID'),
    line('-'),
    lr(`No. ${String(opts.orderNo).padStart(4, '0')}`, opts.stamp),
    lr('Kasir', 'ezra-bot'),
    line('-'),
  ];
  for (const item of opts.items) {
    rows.push(lr(`1x ${item.name}`, 'Rp 0'));
    for (const d of item.detail) for (const f of fitDetail(d)) rows.push(`   ${f}`);
  }
  rows.push(
    line('-'),
    lr('ITEMS', String(opts.items.length)),
    lr('TOTAL', 'Rp 0'),
    lr('STATUS', 'LUNAS'),
    '',
    center('TERIMA KASIH'),
  );
  return rows.join('\n');
}
