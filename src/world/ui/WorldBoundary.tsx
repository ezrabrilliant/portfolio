import { Component } from "react";
import type { JSX, ReactNode } from "react";
import { SeoMirror } from "./SeoMirror";

interface BoundaryProps {
  /** Called once when the world fails: its chunk didn't download (network, blocker, stale deploy) or it threw. */
  onError: (error: unknown) => void;
  children?: ReactNode;
}

/**
 * Error boundary around the lazily loaded 3D world. Without it a failed `import()` unmounts the whole React root
 * (blank page, Loader gone). It renders nothing once tripped; WorldApp swaps the page to WorldLoadFailed.
 */
export class WorldBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    this.props.onError(error);
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

/** The page when the world couldn't load: an honest line, a retry, and all the content as plain text. */
export function WorldLoadFailed({ onRetry }: { onRetry: () => void }): JSX.Element {
  return (
    <div className="nowebgl">
      <p className="nowebgl-note">The 3D world couldn't load. Here's everything in text instead.</p>
      <p>
        <button type="button" className="hud-btn" onClick={onRetry}>
          Try again
        </button>
      </p>
      <SeoMirror visible />
    </div>
  );
}
