import { describe, expect, it } from 'vitest';
import { BOT_COMMANDS, botGreeting, botReply } from './bot-replies';

describe('botReply', () => {
  it('/projects lists the five featured systems with their hero metrics, openable', () => {
    const msgs = botReply('/projects');
    expect(msgs).toHaveLength(5);
    expect(msgs[0].text).toContain('Orbit Store');
    expect(msgs[0].text).toContain('2,700+ paid orders');
    expect(msgs[0].action).toEqual({ label: 'buka Orbit Store', open: 'case:orbit-store' });
  });

  it('/systems counts live systems and offers Monitor', () => {
    const msgs = botReply('/systems');
    expect(msgs[0].text).toContain('4 sistem masih live');
    expect(msgs[0].text).toContain('Orbit Store sudah shipped');
    expect(msgs[1].action).toEqual({ label: 'buka Monitor', open: 'monitor' });
  });

  it('/experience replays the ship log chronologically', () => {
    const msgs = botReply('/experience');
    expect(msgs.length).toBeGreaterThanOrEqual(6);
    expect(msgs[0].text).toMatch(/^2022-09/);
    expect(msgs[msgs.length - 1].text).toContain('EzraOS');
  });

  it('/contact gives the email and offers Kasir', () => {
    const msgs = botReply('/contact');
    expect(msgs[0].text).toContain('ezrakonterliem@gmail.com');
    expect(msgs[1].action).toEqual({ label: 'buka Kasir', open: 'kasir' });
  });

  it('is forgiving about case, whitespace and the leading slash', () => {
    expect(botReply('  /PROJECTS  ')).toHaveLength(5);
    expect(botReply('projects')).toHaveLength(5);
  });

  it('unknown input replies friendly and lists the four commands', () => {
    const msgs = botReply('sell me a diamond lock');
    expect(msgs).toHaveLength(1);
    for (const cmd of BOT_COMMANDS) expect(msgs[0].text).toContain(cmd);
  });

  it('greeting mentions the real bot it is a copy of', () => {
    expect(botGreeting().text).toContain('1,000+ member');
  });
});
