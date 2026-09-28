import { describe, expect, it } from 'vitest';
import { buildReceipt, RECEIPT_WIDTH, wibStamp, wrap } from './receipt';
import { contactItem, messageItem, projectsItem, resumeItem } from './kasir-items';

describe('buildReceipt', () => {
  const receipt = buildReceipt({
    orderNo: 7,
    stamp: '27/09/2026 14:05 WIB',
    items: [contactItem(), projectsItem(), resumeItem()],
  });
  const lines = receipt.split('\n');

  it('every line fits the 40-column tape', () => {
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(RECEIPT_WIDTH);
  });

  it('carries header, zero-padded order number, stamp and kasir', () => {
    expect(lines[0].trim()).toBe('EZRAOS KASIR');
    expect(receipt).toContain('No. 0007');
    expect(receipt).toContain('27/09/2026 14:05 WIB');
    expect(receipt).toContain('ezra-bot');
  });

  it('every item is free and the order settles', () => {
    expect(receipt.match(/Rp 0/g)!.length).toBeGreaterThanOrEqual(4); // 3 items + TOTAL
    expect(receipt).toContain('LUNAS');
    expect(receipt).toContain('TERIMA KASIH');
  });

  it('item details answer the visitor questions', () => {
    expect(receipt).toContain('ezrakonterliem@gmail.com');       // contact card
    expect(receipt).toContain('2,700+ paid orders');             // project list metric
    expect(receipt).toContain('/resume.pdf');                    // resume link
  });

  it('message lines (sent and failed) also fit the tape, and an overlong detail wraps instead of overflowing', () => {
    const r = buildReceipt({
      orderNo: 1, stamp: '27/09/2026 14:05 WIB',
      items: [messageItem(true), messageItem(false), { name: 'x', detail: ['word '.repeat(20).trim(), '  ' + 'y'.repeat(60)] }],
    });
    for (const l of r.split('\n')) expect(l.length).toBeLessThanOrEqual(RECEIPT_WIDTH);
    expect(r).toContain('ezrakonterliem@gmail.com');
    expect(r.match(/word/g)!.length).toBe(20); // wrapped, nothing dropped
  });
});

describe('messageItem', () => {
  it('prints MESSAGE SENT on success', () => {
    expect(messageItem(true).detail.join('\n')).toContain('MESSAGE SENT');
  });
  it('prints MESSAGE FAILED with the email fallback on failure', () => {
    const d = messageItem(false).detail.join('\n');
    expect(d).toContain('MESSAGE FAILED');
    expect(d).toContain('ezrakonterliem@gmail.com');
    expect(d).not.toContain('MESSAGE SENT');
  });
});

describe('wibStamp', () => {
  it('formats in Asia/Jakarta', () => {
    expect(wibStamp(new Date('2026-09-27T05:00:00Z'))).toBe('27/09/2026 12:00 WIB');
  });
  it('prints the minutes after midnight as 00, never 24', () => {
    expect(wibStamp(new Date('2026-09-26T17:05:00Z'))).toBe('27/09/2026 00:05 WIB');
  });
});

describe('wrap', () => {
  it('wrap never hangs at width 0', () => {
    for (const w of [0, -3]) {
      const out = wrap('halo ezra', w);
      expect(out.length).toBeGreaterThan(0);
      for (const l of out) expect(l.length).toBeGreaterThan(0);
      expect(out.join('')).toBe('haloezra');
    }
  });
});
