import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockMatchMedia } from '@/test/match-media';
import { WindowManagerProvider, useWM } from '@/os/WindowManagerContext';
import MarketApp, { sparkPoints } from './MarketApp';

function Probe() {
  const wm = useWM();
  return <output data-testid="open-ids">{wm.state.windows.map((w) => w.id).join(',')}</output>;
}
const ui = () => {
  mockMatchMedia(['prefers-reduced-motion']);
  return render(<WindowManagerProvider><MarketApp /><Probe /></WindowManagerProvider>);
};

describe('MarketApp', () => {
  it('lists all 12 assets, the five featured first in locked order', () => {
    ui();
    const rows = screen.getAllByRole('button', { name: /open .*case/ });
    expect(rows).toHaveLength(12);
    expect(rows[0]).toHaveAccessibleName('open Orbit Store case');
    expect(rows[1]).toHaveAccessibleName('open Petak Umpet case');
    expect(rows[2]).toHaveAccessibleName('open GTID case');
    expect(rows[3]).toHaveAccessibleName('open Ezra Bot case');
    expect(rows[4]).toHaveAccessibleName('open POS Monosuko case');
  });

  it('clicking an asset requests its case window', async () => {
    ui();
    await userEvent.click(screen.getByRole('button', { name: 'open GTID case' }));
    expect(screen.getByTestId('open-ids')).toHaveTextContent('case:gtid');
  });

  it('sparklines are deterministic decoration — same slug, same shape', () => {
    expect(sparkPoints('gtid')).toBe(sparkPoints('gtid'));
    expect(sparkPoints('gtid')).not.toBe(sparkPoints('pay2win'));
    // decorative only: points, no numbers
    expect(sparkPoints('gtid')).toMatch(/^[\d.,\s-]+$/);
  });
});
