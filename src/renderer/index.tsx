import { createRoot } from 'react-dom/client';
import { getApp } from '../app';

async function main() {
  const container = document.getElementById('root') as HTMLElement;
  const root = createRoot(container);
  root.render(await getApp(window.electron.store));
}

main();
