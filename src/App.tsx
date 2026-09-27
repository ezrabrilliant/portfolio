import { EzraOS } from '@/os/EzraOS';
import { WindowManagerProvider } from '@/os/WindowManagerContext';

export default function App() {
  return (
    <WindowManagerProvider>
      <EzraOS />
    </WindowManagerProvider>
  );
}
