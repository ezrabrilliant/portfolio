import { describe, expect, it } from 'vitest';
import { config } from './portfolio';
import {
  FEATURED_ORDER, getCaseStudy, getFeaturedCases, getFoldersByYear,
  getLiveSystems, getMarketList, getProjectCount, getShipLog, getContact,
  getEducation, bare,
} from './os-content';

describe('content rules (locked)', () => {
  const whole = JSON.stringify(config);
  it.each(['UAT', 'SUS', '73/73', '$0.5', '/month', '1 GB', 'Learning Hours'])(
    'banned string "%s" appears nowhere in portfolio.ts', (banned) => {
      expect(whole).not.toContain(banned);
    });

  it('POS Monosuko copy leads with the 41% metric, not validation scores', () => {
    const pos = getCaseStudy('pos-monosuko')!;
    expect(pos.metric).toBe('41% faster checkout');
    expect(pos.description).toMatch(/41%/);
  });
});

describe('selectors', () => {
  it('featured cases follow the locked lead-metric order', () => {
    expect(getFeaturedCases().map((c) => c.slug)).toEqual([...FEATURED_ORDER]);
    expect(getFeaturedCases()[0].metric).toBe('2,700+ paid orders from 370+ buyers');
  });

  it('market list is featured-first and covers every project once', () => {
    const slugs = getMarketList().map((c) => c.slug);
    expect(slugs.slice(0, 5)).toEqual([...FEATURED_ORDER]);
    expect(new Set(slugs).size).toBe(getProjectCount());
  });

  it('project count is derived, currently 12', () => {
    expect(getProjectCount()).toBe(config.projects.length);
    expect(getProjectCount()).toBe(12);
  });

  it('folders include a 2023 folder containing pay2win', () => {
    const folders = getFoldersByYear();
    expect(folders[0].year).toBe(2023);
    expect(folders[0].slugs).toContain('pay2win');
    expect(folders.flatMap((f) => f.slugs)).toHaveLength(12);
  });

  it('liveSystems matches the spec monitor table', () => {
    const s = getLiveSystems();
    expect(s.map((x) => x.proc)).toEqual(['orbit-store', 'gtid', 'petak-umpet', 'ezra-bot', 'pos-monosuko']);
    expect(s[0].status).toBe('shipped');
    expect(s.filter((x) => x.status === 'live')).toHaveLength(4);
  });

  it('unknown slug returns undefined, never throws', () => {
    expect(getCaseStudy('does-not-exist')).toBeUndefined();
  });

  it('ship log is chronological and non-empty', () => {
    const log = getShipLog();
    expect(log.length).toBeGreaterThanOrEqual(6);
    expect([...log].sort((a, b) => a.date.localeCompare(b.date))).toEqual(log);
  });

  it('tech reads as a plain sentence, never a badge cloud', () => {
    expect(getCaseStudy('gtid')!.techSentence).toMatch(/^Built with .+ and .+\.$/);
  });

  it('links are derived from demo/github and omit empty ones', () => {
    expect(getCaseStudy('orbit-store')!.links).toEqual([]);
    expect(getCaseStudy('pos-monosuko')!.links).toContainEqual({
      label: 'monosuko.my.id', href: 'https://monosuko.my.id',
    });
  });

  it('contact carries the resume path for Kasir', () => {
    expect(getContact().resume).toBe('/resume.pdf');
  });
});

describe('getEducation and bare', () => {
  it('getEducation returns the Petra entry verbatim from config.education', () => {
    const petra = config.education.find((e) => e.institution === 'Petra Christian University')!;
    expect(getEducation()).toEqual({ degree: petra.degree, institution: petra.institution });
  });

  it('bare strips scheme, www and a trailing slash', () => {
    expect(bare('https://www.github.com/ezrabrilliant/')).toBe('github.com/ezrabrilliant');
    expect(bare('http://linkedin.com/in/ezrabrilliant')).toBe('linkedin.com/in/ezrabrilliant');
  });
});
