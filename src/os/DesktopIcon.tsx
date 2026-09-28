import { GLYPHS } from './icons';

export interface DesktopIconProps {
  app: keyof typeof GLYPHS;
  label: string;
  selected: boolean;
  onSelect: () => void;
  onOpen: (opener: HTMLElement) => void;
  /** Phone mode: a single tap opens (no double-click on a home screen). */
  tapOpens?: boolean;
  /** Phone-grid position (CSS `order`); desktop leaves it in document order. */
  order?: number;
}

export function DesktopIcon({ app, label, selected, onSelect, onOpen, tapOpens, order }: DesktopIconProps) {
  return (
    <button
      type="button"
      className={`icon${selected ? ' sel' : ''}`}
      data-app={app}
      style={order === undefined ? undefined : { order }}
      onClick={(e) => {
        const keyboardOrTouch = e.detail === 0;
        onSelect();
        if (keyboardOrTouch || tapOpens) onOpen(e.currentTarget);
      }}
      onDoubleClick={(e) => onOpen(e.currentTarget)}
    >
      <span className="tile">{GLYPHS[app]}</span>
      <span className="lbl">{label}</span>
    </button>
  );
}
