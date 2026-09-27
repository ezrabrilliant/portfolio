import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockMatchMedia } from '@/test/match-media';
import { WindowManagerProvider, useWM } from '@/os/WindowManagerContext';
import FilesApp from './FilesApp';

function Probe() {
  const wm = useWM();
  return <output data-testid="open-ids">{wm.state.windows.map((w) => w.id).join(',')}</output>;
}
const ui = () => {
  mockMatchMedia(['prefers-reduced-motion']);
  return render(<WindowManagerProvider><FilesApp /><Probe /></WindowManagerProvider>);
};

describe('FilesApp', () => {
  it('root lists year folders 2023–2026 with file counts', () => {
    ui();
    expect(screen.getByText('/projects')).toBeInTheDocument();
    const folders = screen.getAllByRole('button', { name: /^open folder/ });
    expect(folders.map((f) => f.textContent)).toEqual([
      expect.stringContaining('2023'), expect.stringContaining('2024'),
      expect.stringContaining('2025'), expect.stringContaining('2026'),
    ]);
    expect(folders[0]).toHaveTextContent('1 file'); // pay2win lives in 2023
  });

  it('entering 2023 shows pay2win.case and ".." goes back up', async () => {
    ui();
    await userEvent.click(screen.getByRole('button', { name: 'open folder 2023' }));
    expect(screen.getByText('/projects/2023')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'open pay2win.case' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'back to /projects' }));
    expect(screen.getByText('/projects')).toBeInTheDocument();
  });

  it('opening a file opens its case window', async () => {
    ui();
    await userEvent.click(screen.getByRole('button', { name: 'open folder 2023' }));
    await userEvent.click(screen.getByRole('button', { name: 'open pay2win.case' }));
    expect(screen.getByTestId('open-ids')).toHaveTextContent('case:pay2win');
  });
});
