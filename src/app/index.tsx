/*
ISC License

Copyright (c) 2019, Bryon Vandiver

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/

import { useEffect, useState } from 'react';
import { DockviewReact } from 'dockview';

import Screen from './screen';
import Debugger from './debugger';
import Registers from './registers';
import Stack from './stack';
import Memory from './memory';
import Blitter from './blitter';
import Settings from './settings';

import SystemContext from './context';

import './style.scss';

const defaultSettings = {
  darkMode: null,
  volume: 0.5,
  frames: 8,
  intensity: 0.8,
  setBlendingType: 'logorithmic',
  weights: [1, 0, 0, 0, 0, 0, 0, 0],
  palette: [
    { offset: '0.00', color: '#B7CAB7' },
    { offset: '1.00', color: '#061806' },
  ],
};

const panels = {
  screen: {
    id: 'screen',
    component: 'screen',
    title: 'Screen',
  },
  debugger: {
    id: 'debugger',
    component: 'debugger',
    title: 'Debugger',
  },
  stack: {
    id: 'stack',
    component: 'stack',
    title: 'Stack',
  },
  registers: {
    id: 'registers',
    component: 'registers',
    title: 'Registers',
  },
  memory: {
    id: 'memory',
    component: 'memory',
    title: 'Memory',
  },
  blitter: {
    id: 'blitter',
    component: 'blitter',
    title: 'Blitter',
  },
  settings: {
    id: 'settings',
    component: 'settings',
    title: 'Settings',
  },
};

const components = {
  screen: (props: IDockviewPanelProps) => <Screen />,
  debugger: (props: IDockviewPanelProps) => <Debugger />,
  stack: (props: IDockviewPanelProps) => <Stack />,
  registers: (props: IDockviewPanelProps) => <Registers />,
  memory: (props: IDockviewPanelProps) => <Memory />,
  blitter: (props: IDockviewPanelProps) => <Blitter />,
  settings: (props: IDockviewPanelProps) => <Settings />,
};

export function App({ store, system }) {
  const [systemDarkMode, setSystemDarkMode] = useState(false);
  const [darkMode, setDarkMode] = useState(getStore('darkMode'));

  function rebuild() {
    let frameCount = getStore('frames');
    let weights = [];

    // Calculate presets for weights
    switch (getStore('blendingType')) {
      case 'disabled':
        frameCount = 1;
      case 'true-gray':
        for (let i = 0; i < 8; i++) weights[i] = i < frameCount ? 1.0 : 0.0;
        break;
      case 'logorithmic':
        for (let i = 0, s = 1; i < 8; i++, s *= getStore('intensity'))
          weights[i] = s;
        break;
      default:
        weights = getStore('weights');
    }

    const palette = getStore('palette').map(({ offset, color }) => ({
      offset: Number(offset),
      r: parseInt(color.substring(1, 3), 16) / 255.0,
      g: parseInt(color.substring(3, 5), 16) / 255.0,
      b: parseInt(color.substring(5, 7), 16) / 255.0,
    }));

    system.setBlendWeights(weights);
    system.setPalette(palette);
    system.audio.setVolume(getStore('volume'));
  }
  rebuild();

  function getStore(key) {
    return store.get(key) || defaultSettings[key];
  }

  function setStore(key, value) {
    if (key == 'darkMode') setDarkMode(value);

    store.set(key, value);
    rebuild();
  }

  if (
    typeof window !== 'undefined' &&
    typeof window.process === 'object' &&
    window.process.type === 'renderer'
  ) {
    // Electron specific event handlers
    useEffect(() => {
      window.electron.ipcRenderer.on('dark-mode', (darkMode) =>
        setSystemDarkMode(darkMode),
      );
      window.electron.getDarkMode();
    });
  } else {
    // Browser specific event handlers
    useEffect(() => {
      if (window.matchMedia) {
        setSystemDarkMode(
          window.matchMedia('(prefers-color-scheme: dark)').matches,
        );
        window
          .matchMedia('(prefers-color-scheme: dark)')
          .addEventListener('change', (event) => {
            setSystemDarkMode(event.matches);
          });
      }
    });
  }

  /*
   * DockView Cruft
   */
  function onReady(event: DockviewReadyEvent) {
    const { api } = event;

    function addPanel(name) {
      const panel = api.getPanel(name);

      if (panel) {
        // TODO: Focus panel here
      } else if (panels[name]) {
        api.addPanel(panels[name]);
      }
    }

    api.onDidLayoutChange(() => {
      addPanel('screen');
      setStore('layout', api.toJSON());
    });

    const layout = getStore('layout');
    if (layout) api.fromJSON(layout);

    addPanel('screen');

    window.electron.ipcRenderer.on('open-view', addPanel);
  }

  return (
    <SystemContext.Provider
      value={{ system, store: { get: getStore, set: setStore } }}
    >
      <DockviewReact
        className={
          (darkMode === 'system' ? systemDarkMode : darkMode === 'true')
            ? 'bp5-dark dockview-theme-dark root-container'
            : 'dockview-theme-light root-container'
        }
        components={components}
        onReady={onReady}
      />
    </SystemContext.Provider>
  );
}
