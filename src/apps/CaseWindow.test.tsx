import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import CaseWindow from './CaseWindow';

describe('CaseWindow', () => {
  it('shows title, hero metric, status/year meta, plain tech sentence and links', () => {
    render(<CaseWindow slug="gtid" />);
    expect(screen.getByRole('heading', { name: 'GTID' })).toBeInTheDocument();
    expect(screen.getByText('~14.5k requests a day')).toBeInTheDocument();
    expect(screen.getByText(/live, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/^Built with .*and .*\.$/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'gtid.pro' })).toHaveAttribute('href', 'https://gtid.pro');
  });

  it('renders file-not-found for an unknown slug', () => {
    // Review Focus #5: a stale id must not crash the OS
    render(<CaseWindow slug="does-not-exist" />);
    expect(screen.getByText(/file not found/i)).toBeInTheDocument();
  });

  it('a non-featured project renders without a metric box', () => {
    render(<CaseWindow slug="pay2win" />);
    expect(screen.getByRole('heading', { name: 'Pay2Win' })).toBeInTheDocument();
    expect(screen.queryByTestId('metric')).not.toBeInTheDocument();
  });
});
