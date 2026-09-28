import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockMatchMedia } from '@/test/match-media';
import { WindowManagerProvider, useWM } from '@/os/WindowManagerContext';
import MonitorApp from './MonitorApp';

function Probe() {
  const wm = useWM();
  return <output data-testid="open-ids">{wm.state.windows.map((w) => w.id).join(',')}</output>;
}
const ui = () => {
  mockMatchMedia(['prefers-reduced-motion']);
  return render(<WindowManagerProvider><MonitorApp /><Probe /></WindowManagerProvider>);
};

describe('MonitorApp', () => {
  it('shows the five processes plus the dimmed next-system row', () => {
    ui();
    const rows = screen.getAllByRole('row').slice(1); // drop header
    expect(rows).toHaveLength(6);
    expect(within(rows[0]).getByText('orbit-store')).toBeInTheDocument();
    expect(within(rows[0]).getByText('shipped')).toBeInTheDocument();
    expect(rows[5]).toHaveClass('dim');
    expect(within(rows[5]).getByText('deploying soon')).toBeInTheDocument();
  });

  it('footer counts are computed from the data', () => {
    ui();
    expect(screen.getByText('5 systems, 4 live, 1 shipped')).toBeInTheDocument();
  });

  it('selecting a row opens that system’s case window', async () => {
    ui();
    await userEvent.click(screen.getByRole('button', { name: /open POS Monosuko case/ }));
    expect(screen.getByTestId('open-ids')).toHaveTextContent('case:pos-monosuko');
  });

  it('each process link’s accessible name contains its visible text (WCAG 2.5.3 Label in Name)', () => {
    ui();
    const table = screen.getByRole('table');
    const procs = within(table).getAllByRole('button');
    expect(procs).toHaveLength(5);
    for (const b of procs) {
      const visible = b.textContent!.trim();
      expect(b).toHaveAccessibleName(expect.stringContaining(visible));
    }
    expect(screen.getByRole('button', { name: 'orbit-store, open Orbit Store case' })).toBeInTheDocument();
  });

  it('each process cell also carries its "What" line, for the phone layout that hides the What column', () => {
    ui();
    const rows = screen.getAllByRole('row').slice(1, 6);
    for (const r of rows) {
      const [proc, what] = within(r).getAllByRole('cell');
      expect(proc.querySelector('.what-sub')).toHaveTextContent(what.textContent!);
    }
    expect(screen.getByRole('columnheader', { name: 'What' })).toHaveClass('what');
  });
});

