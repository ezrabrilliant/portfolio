/** EzraOS colour tokens. tokens.css MUST mirror these values — the contrast test guards this file. */
export const TOKENS = {
  desk: '#1E2333',   // wallpaper, deep ink-indigo
  paper: '#F4F1E8',  // window body
  ink: '#1D1B16',    // text, borders, inactive title bars
  amber: '#FFB300',  // active title bar, boot log text
  muted: '#5E5A50',  // secondary text on paper/card
  card: '#FFFDF7',   // raised surfaces inside windows
  rule: '#D9D3C2',   // hairlines, table headers (never carries text alone)
  bootbg: '#14121A', // boot screen background
} as const;

/** WCAG 2.1 relative luminance + contrast ratio. */
function channel(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}
export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
