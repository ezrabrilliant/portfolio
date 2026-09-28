import { bare, getBio, getContact, getEducation, getLiveSystems } from '@/config/os-content';
import { CYCLE_SHORTCUT_LABEL } from '@/os/app-registry';

export interface CmdResult { output: string; clear?: boolean }

/** right-pads to a column width, always leaving at least one space so columns never touch */
const pad = (s: string, n: number) => s + ' '.repeat(Math.max(1, n - s.length));

const CMDS: Record<string, () => CmdResult> = {
  help: () => ({
    output: [
      'commands',
      '  help      this list',
      '  whoami    who runs this machine',
      '  projects  the five production systems',
      '  contact   how to reach Ezra',
      '  clear     wipe the screen',
      `window keys: Esc closes, ${CYCLE_SHORTCUT_LABEL} cycles windows`,
    ].join('\n'),
  }),
  whoami: () => {
    const b = getBio();
    const e = getEducation();
    return {
      output: `${b.name}, ${e.degree}, ${e.institution}\nbased in ${b.location}\nbuilds production systems, then keeps them running`,
    };
  },
  projects: () => ({
    output: getLiveSystems()
      .map((s) => pad(s.proc, 14) + pad(s.metric, 22) + s.status)
      .join('\n'),
  }),
  contact: () => {
    const c = getContact();
    return {
      output: `email     ${c.email}\ngithub    ${bare(c.github)}\nlinkedin  ${bare(c.linkedin)}`,
    };
  },
  clear: () => ({ output: '', clear: true }),
};

export function runCommand(raw: string): CmdResult {
  // Review Focus #3: stray whitespace and capitals still run the command ("  HELP  " is help)
  const cmd = raw.trim().toLowerCase();
  if (!cmd) return { output: '' };
  // own-key check: "constructor" or "toString" must be unknown, not Object.prototype members
  if (Object.hasOwn(CMDS, cmd)) return CMDS[cmd]();
  return { output: `${cmd.split(/\s+/)[0]}: command not found — try help` };
}
