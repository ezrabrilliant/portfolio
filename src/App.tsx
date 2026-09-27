import { useState } from 'react';
import { Boot } from '@/os/Boot';
import { EzraOS } from '@/os/EzraOS';
import { WindowManagerProvider } from '@/os/WindowManagerContext';

export default function App() {
  const [booted, setBooted] = useState(false);
  return (
    <WindowManagerProvider>
      {booted ? <EzraOS /> : <Boot onDone={() => setBooted(true)} />}
    </WindowManagerProvider>
  );
}
