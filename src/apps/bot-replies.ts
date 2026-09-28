import { bare, getContact, getFeaturedCases, getLiveSystems, getShipLog } from '@/config/os-content';

export const BOT_COMMANDS = ['/projects', '/systems', '/experience', '/contact'] as const;

export interface BotAction { label: string; open: string }
export interface BotMessage { text: string; action?: BotAction }

export function botGreeting(): BotMessage {
  // the member count is read from the Ezra Bot row in liveSystems ("1,000+ members"), never typed twice
  const metric = getLiveSystems().find((s) => s.slug === 'ezra-bot')?.metric;
  const reach = metric ? ` melayani ${metric.replace(/\s*members?$/, '')} member` : '';
  return {
    text: `halo! aku Ezra Bot — versi asliku${reach} di Discord. coba /projects, /systems, /experience, atau /contact.`,
  };
}

export function botReply(raw: string): BotMessage[] {
  const cmd = raw.trim().toLowerCase().replace(/^\//, '');
  switch (cmd) {
    case 'projects':
      return getFeaturedCases().map((c) => ({
        text: `${c.title} — ${c.metric ?? c.year}`,
        action: { label: `buka ${c.title}`, open: `case:${c.slug}` },
      }));
    case 'systems': {
      const systems = getLiveSystems();
      const live = systems.filter((s) => s.status === 'live');
      const shipped = systems.filter((s) => s.status === 'shipped');
      return [
        {
          text: `${live.length} sistem masih live: ${live.map((s) => s.name).join(', ')}. ${shipped.map((s) => s.name).join(', ')} sudah shipped.`,
        },
        { text: 'status lengkapnya ada di Monitor.', action: { label: 'buka Monitor', open: 'monitor' } },
      ];
    }
    case 'experience':
      return getShipLog().map((e) => ({ text: `${e.date} — ${e.text}` }));
    case 'contact': {
      const c = getContact();
      return [
        { text: `paling cepat lewat email: ${c.email}. kodenya di ${bare(c.github)}, profilnya di LinkedIn.` },
        { text: 'atau pesan resume dan kirim pesan lewat Kasir.', action: { label: 'buka Kasir', open: 'kasir' } },
      ];
    }
    default:
      return [
        { text: `aku belum paham "${raw.trim()}". coba salah satu: ${BOT_COMMANDS.join(', ')}.` },
      ];
  }
}
