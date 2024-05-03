import { createRoot } from 'react-dom/client';
import { App } from '../app';
import Minimon from '../emulation';

async function main() {
  const system = await Minimon.getMinimon();
  system.running = true;

  const container = document.getElementById('root') as HTMLElement;
  const root = createRoot(container);

  root.render(<App system={system} store={window.electron.store} />);

  window.electron.ipcRenderer.on('load-file', (binary) => system.load(binary));
}

main();
