import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// os.css locks html/body to 100% height + overflow:hidden for the OS desk. Without JS
// there is no desk, so index.html must undo that or the <noscript> content is clipped.
// In the production build Vite injects the os.css <link> at the END of <head>, i.e. after
// this override, and both use the same `html, body` specificity — so the override only wins
// the cascade with !important.
describe('index.html no-JS scroll override', () => {
  const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
  const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'));

  it('has a <noscript><style> in <head> restoring height:auto and overflow:auto (!important) on html,body', () => {
    const noscripts = [...head.matchAll(/<noscript>([\s\S]*?)<\/noscript>/g)].map((m) => m[1]);
    const override = noscripts.find((n) => /<style>[^<]*html\s*,\s*body\s*\{[^}]*\}[^<]*<\/style>/.test(n));
    expect(override).toBeDefined();
    const rule = override!.match(/html\s*,\s*body\s*\{([^}]*)\}/)![1].replace(/\s+/g, '');
    expect(rule).toContain('height:auto!important');
    expect(rule).toContain('overflow:auto!important');
  });
});
