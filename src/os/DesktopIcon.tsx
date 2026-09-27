import { GLYPHS } from './icons';

export interface DesktopIconProps {
  app: keyof typeof GLYPHS;
  label: string;
  selected: boolean;
  onSelect: () => void;
  onOpen: (opener: HTMLElement) => void;
}

export function DesktopIcon({ app, label, selected, onSelect, onOpen }: DesktopIconProps) {
  return (
    <button
      type="button"
      className={`icon${selected ? ' sel' : ''}`}
      onClick={(e) => {
        const keyboardOrTouch = e.detail === 0;
        onSelect();
        if (keyboardOrTouch) onOpen(e.currentTarget);
      }}
      onDoubleClick={(e) => onOpen(e.currentTarget)}
    >
      <span className="tile">{GLYPHS[app]}</span>
      <span className="lbl">{label}</span>
    </button>
  );
}
