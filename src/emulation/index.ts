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

import { struct } from './state';
import Audio from './audio';

import AssemblyCore from '../../assets/libminimon.wasm';
import Tracer from './trace';

const KEYBOARD_CODES = {
  67: 0b00000001,
  88: 0b00000010,
  90: 0b00000100,
  38: 0b00001000,
  40: 0b00010000,
  37: 0b00100000,
  39: 0b01000000,
  8: 0b10000000,
};

const INPUT_CART_N = 0b1000000000;
const CPU_FREQ = 4000000;

export default class Minimon extends EventTarget {
  public state: Object | null;
  public audio: Audio;
  private cpu_state: number;
  private machineBytes: Uint8Array | null;
  private systemTime: number;
  private breakpoints: Array<number>;
  private inputState: number;
  private tracer: Tracer;
  private exports;
  private runTimer;

  public clearColor = { r: 1, g: 1, b: 1 };

  private constructor() {
    super();

    this.cpu_state = 0;
    this.inputState = 0b1111111111;
    this.audio = new Audio();
    this.breakpoints = [];
    this.runTimer = null;
    this.machineBytes = null;
    this.state = null;
    this.systemTime = Date.now();

    document.body.addEventListener('keydown', (e: KeyboardEvent) => {
      this.inputState &= ~(KEYBOARD_CODES[e.keyCode] || 0);
      this.updateInput();
    });

    document.body.addEventListener('keyup', (e: KeyboardEvent) => {
      this.inputState |= KEYBOARD_CODES[e.keyCode] || 0;
      this.updateInput();
    });
  }

  public static async getMinimon() {
    const inst = new Minimon();

    const request = await fetch(AssemblyCore);
    const wasm = await WebAssembly.instantiate(await request.arrayBuffer(), {
      env: {
        trace_access: (cpu: number, address: number, kind: number, data: number) => inst.tracer.traceAccess(cpu, address, kind, data),
        audio_push: () => {
          inst.audio.push(inst.state.buffers.audio);
        },
        debug_print: (start: number) => {
          const utf8decoder = new TextDecoder();
          const end = inst.machineBytes?.indexOf(0, start);

          const string = utf8decoder.decode(
            new Uint8Array(inst.machineBytes.buffer, start, end - start),
          );
        },
      },
    });

    inst.exports = wasm.instance.exports;
    inst.cpu_state = inst.exports.get_machine();
    inst.machineBytes = new Uint8Array(inst.exports.memory.buffer);
    inst.exports.set_sample_rate(inst.cpu_state, inst.audio.sampleRate);

    inst.state = struct(
      inst.exports.memory.buffer,
      inst.exports.get_description(),
      inst.cpu_state,
    );
    inst.tracer = new Tracer(inst);

    // Setup initial palette
    for (let i = 0; i <= 0xff; i++) {
      inst.state.buffers.palette[i] = (0x010101 * i) ^ ~0;
      inst.state.buffers.weights[i] = i / 255.0;
    }

    inst.reset();

    return inst;
  }

  get running() {
    return this.runTimer !== null;
  }

  set running(v) {
    if (this.running == v) return;

    if (v) {
      this.systemTime = Date.now();
      this.runTimer = setInterval(this.tick, 0);
    } else {
      clearInterval(this.runTimer);
      this.runTimer = null;
    }

    this.dispatchEvent(new CustomEvent('update:running', { detail: v }));
  }

  tick = () => {
    if (!this.running) return;

    const now = Date.now();
    const delta = Math.floor(
      (Math.min(200, now - this.systemTime) * CPU_FREQ) / 1000,
    );

    this.systemTime = now;

    if (this.breakpoints.length) {
      this.state.clocks += delta; // advance our clock

      while (this.state.clocks > 0) {
        if (this.breakpoints.indexOf(this.physicalPC()) >= 0) {
          this.running = false;
          break;
        }

        this.exports.cpu_step(this.cpu_state);
      }
    } else {
      this.exports.cpu_advance(this.cpu_state, delta);
    }

    this.update();
  };

  update() {
    this.dispatchEvent(new CustomEvent('update:state', { detail: this.state }));
    this.tracer.update();
  }

  private updateInput() {
    this.exports.update_inputs(this.cpu_state, this.inputState);
  }

  // Colorization
  setPalette(palette) {
    const last = palette.length - 1;

    // And cap stops
    if (palette[0].offset > 0) {
      palette.unshift({ ...palette[0], offset: 0.0 });
    }

    if (palette[last].offset < 1) {
      palette.push({ ...palette[last], offset: 1.0 });
    }

    // Generate our gradient
    this.clearColor = { ... palette[0] };
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

      this.state.buffers.palette[i] = (
        0xff000000 +
        +Math.min(0xff, Math.floor(r * 0x100)) +
        Math.min(0xff, Math.floor(g * 0x100)) * 0x0100 +
        Math.min(0xff, Math.floor(b * 0x100)) * 0x010000
      );
    }
  }

  setBlendWeights(weights) {
    // Calculate our blending ratios
    const ratio = weights.reduce((a, b) => a + b, 0) || 1.0;

    // Clear weights
    for (let i = 0; i < 0x100; i++) this.state.buffers.weights[i] = 0;

    // Submit weights
    for (let m = 0x80, b = 0; m; m >>= 1, b++) {
      const scaledWeight = weights[b] / ratio;
      for (let i = m; i < 0x100; i = (i + 1) | m) {
        this.state.buffers.weights[i] += scaledWeight;
      }
    }
  }

  // Cartridge I/O
  load(ab) {
    const bytes = new Uint8Array(ab);
    const hasHeader = bytes[0] != 0x50 || bytes[1] != 0x4d;
    const offset = hasHeader ? 0 : 0x2100;

    this.eject();
    for (let i = bytes.length - 1; i >= 0; i--)
      this.state.buffers.cartridge[(i + offset) & 0x1fffff] = bytes[i];

    setTimeout(() => {
      this.inputState &= ~INPUT_CART_N;
      this.updateInput();
    }, 100);
  }

  eject() {
    this.dispatchEvent(new Event('update:cartridgeChanged'));
    this.tracer.reset(this);
    this.inputState |= INPUT_CART_N;
    this.updateInput();
  }

  physicalPC() {
    const address = this.state.cpu.pc;
    if (address & 0x8000) {
      return (address & 0x7fff) | (this.state.cpu.cb << 15);
    }
    return address;
  }

  step() {
    this.exports.cpu_step(this.cpu_state);
    this.update();
  }

  reset() {
    this.exports.cpu_reset(this.cpu_state);
    this.updateInput();
    this.update();
  }

  read(address) {
    return this.exports.cpu_read(this.cpu_state, address);
  }

  write(data, address) {
    return this.exports.cpu_write(this.cpu_state, data, address);
  }
}
