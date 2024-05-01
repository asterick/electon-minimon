import { createRoot } from 'react-dom/client';
import { getApp } from '../app';
import Minimon from '../app/machine';

async function main() {
  const system = await Minimon.getMinimon();
  system.running = true;

  const container = document.getElementById('root') as HTMLElement;
  const root = createRoot(container);
  root.render(await getApp(system, window.electron.store));

  window.electron.ipcRenderer.on('load-file', (binary) => system.load(binary));
}

main();
