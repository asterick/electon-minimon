import 'normalize.css/normalize.css';
import 'rc-dock/dist/rc-dock.css';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import './style.css';

import { DockLayout, LayoutData } from 'rc-dock';

import Screen from './screen';
import Settings from './settings';
import Debugger from './debugger';

import SystemContext from './context';

const defaultSettings = {
  settings: {
    volume: 0.5,
    frames: 8,
    intensity: 0.5,
    setBlendingType: 'disabled',
    weights: [1, 0, 0, 0, 0, 0, 0, 0],
    palette: [
      { offset: '0.00', color: '#B7CAB7' },
      { offset: '1.00', color: '#061806' },
    ],
  },
};

export async function getApp(system, store) {
  function getStore(key) {
    return store.get(key) || defaultSettings[key];
  }

  function setStore(key, value) {
    store.set(key, value);
    if (key == 'settings') rebuild();
  }

  function parseColor(v: String) {
    const r = parseInt(v.substring(1, 3), 16) / 255.0;
    const g = parseInt(v.substring(3, 5), 16) / 255.0;
    const b = parseInt(v.substring(5, 7), 16) / 255.0;

    return { r, g, b };
  }

  function packColor(r: Number, g: Number, b: Number) {
    return (
      0xff000000 +
      +Math.min(0xff, Math.floor(r * 0x100)) +
      Math.min(0xff, Math.floor(g * 0x100)) * 0x0100 +
      Math.min(0xff, Math.floor(b * 0x100)) * 0x010000
    );
  }

  function rebuild() {
    const settings = getStore('settings');
    const palette = settings.palette.map((v) => ({
      offset: Number(v.offset),
      ...parseColor(v.color),
    }));
    const last = palette.length - 1;
    let frameCount = settings.frames;
    let weights = [];

    system.audio.setVolume(settings.volume);

    // Calculate presets for weights
    switch (settings.blendingType) {
      case 'disabled':
        frameCount = 1;
      case 'true-gray':
        for (let i = 0; i < 8; i++) weights[i] = i < frameCount ? 1.0 : 0.0;
        break;
      case 'logorithmic':
        for (let i = 0, s = 1; i < 8; i++, s *= settings.intensity)
          weights[i] = s;
        break;
      default:
        weights = settings.weights;
    }

    // Calculate our blending ratios
    const ratio = weights.reduce((a, b) => a + b, 0) || 1.0;

    // Clear weights
    for (let i = 0; i < 0x100; i++) system.state.buffers.weights[i] = 0;

    // Submit weights
    for (let m = 0x80, b = 0; m; m >>= 1, b++) {
      const scaledWeight = weights[b] / ratio;
      for (let i = m; i < 0x100; i = (i + 1) | m) {
        system.state.buffers.weights[i] += scaledWeight;
      }
    }

    // And cap stops
    if (palette[0].offset > 0) {
      palette.unshift({ ...palette[0], offset: 0.0 });
    }

    if (palette[last].offset < 1) {
      palette.push({ ...palette[last], offset: 1.0 });
    }

    system.clearColor = { ...palette[0] };

    // Generate our gradient
    let index = 0;
    for (let i = 0; i <= 0xff; i++) {
      const offset = i / 255.0;
      let next = palette[index + 1];
      while (offset > next.offset) {
        next = palette[++index + 1];
      }
      const current = palette[index];

      const lo = current.offset;
      const hi = next.offset;
      const weight = (offset - lo) / (hi - lo);

      const r = next.r * weight + current.r * (1 - weight);
      const g = next.g * weight + current.g * (1 - weight);
      const b = next.b * weight + current.b * (1 - weight);

      system.state.buffers.palette[i] = packColor(r, g, b);
    }
  }
  rebuild();

  // Setup UI
  const defaultLayout: LayoutData = {
    dockbox: {
      mode: 'horizontal',
      children: [
        {
          tabs: [
            { id: 'system', title: 'System', content: <Screen /> },
            { id: 'settings', title: 'Settings', content: <Settings /> },
            { id: 'debugger', title: 'Debugger', content: <Debugger /> },
          ],
        },
      ],
    },
  };

  return (
    <SystemContext.Provider
      value={{ system, store: { get: getStore, set: setStore } }}
    >
      <DockLayout defaultLayout={defaultLayout} />
    </SystemContext.Provider>
  );
}
