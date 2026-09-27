import { Desktop } from './Desktop';
import { Dock } from './Dock';
import { MenuBar } from './MenuBar';

export function EzraOS() {
  return (
    <div id="os">
      <MenuBar />
      <Desktop />
      <Dock />
    </div>
  );
}
