/** Rupiah with English digit grouping, whole rupiah: 30000 → "Rp 30,000" (never the Indonesian locale's "30.000"). */
export function formatRupiah(n: number): string {
  const sign = n < 0 ? "-" : "";
  const digits = String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}Rp ${digits}`;
}

/** Adds a rounded-rectangle path (fill or stroke it afterwards); the radius is clamped to half the shorter side. */
export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

/** Greedy word wrap with the context's current font; a word wider than maxW keeps a line of its own. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxW) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}
