import { bare, getBio, getContact, getEducation, getFeaturedCases } from '@/config/os-content';
import { DETAIL_WIDTH, wrap, type ReceiptItem } from './receipt';

/** Column where a project's metric starts, after its slug. */
const SLUG_COL = 14;

export function contactItem(): ReceiptItem {
  const c = getContact();
  // unlabeled: each value names itself, and "linkedin " + the LinkedIn URL would overflow the tape
  return {
    name: 'Contact card',
    detail: [c.email, bare(c.github), bare(c.linkedin)],
  };
}

export function projectsItem(): ReceiptItem {
  const detail: string[] = [];
  for (const p of getFeaturedCases()) {
    // metrics wrap on word boundaries under their own column instead of being cut mid-word
    const metric = p.metric ? wrap(p.metric, DETAIL_WIDTH - SLUG_COL) : [''];
    metric.forEach((m, i) => {
      detail.push(`${(i === 0 ? p.slug : '').padEnd(SLUG_COL)}${m}`.trimEnd());
    });
  }
  return { name: 'Project list', detail };
}

export function resumeItem(): ReceiptItem {
  const bio = getBio();
  const c = getContact();
  const edu = getEducation();
  return {
    name: 'Resume',
    detail: [
      `${edu.degree.replace(/^Bachelor of /, '')},`,
      `  ${edu.institution}`,
      'Bangkit Academy 2024, top graduate',
      `CV ezrabrilliant.com${c.resume}`,
      `(${bio.location})`,
    ],
  };
}

export function messageItem(sent: boolean): ReceiptItem {
  const c = getContact();
  return {
    name: 'Kirim pesan',
    detail: sent
      ? ['MESSAGE SENT']
      : ['MESSAGE FAILED', 'email directly instead:', c.email],
  };
}
