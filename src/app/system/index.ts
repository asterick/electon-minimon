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

import { struct } from "./state";
import Audio from "./audio";

import AssemblyCore from '../../../assets/libminimon.wasm';

const KEYBOARD_CODES = {
	67: 0b00000001,
	88: 0b00000010,
	90: 0b00000100,
	38: 0b00001000,
	40: 0b00010000,
	37: 0b00100000,
	39: 0b01000000,
	 8: 0b10000000
};

const INPUT_CART_N = 0b1000000000;
const CPU_FREQ = 4000000;

export default class Minimon {
	public state:Object | null;
	private audio:Audio;

	private cpu_state:number;
	private machineBytes:Uint8Array | null;
	private exports;
	private runTimer;
	private systemTime:number;
	private breakpoints:Array<number>;

	private inputState:number;

	private constructor() {
		this.cpu_state = 0;
		this.inputState = 0b1111111111;
		this.audio = new Audio();
		this.breakpoints = [];
		this.runTimer = null;
		this.machineBytes = null;
		this.state = null;
		this.systemTime = Date.now();

		document.body.addEventListener('keydown', (e:KeyboardEvent) => {
			this.inputState &= ~(KEYBOARD_CODES[e.keyCode] || 0);
			this.updateInput();
		});

		document.body.addEventListener('keyup', (e:KeyboardEvent) => {
			this.inputState |= (KEYBOARD_CODES[e.keyCode] || 0);
			this.updateInput();
		});
	}

	public static async getMinimon() {
		const inst = new Minimon();

		const request = await fetch(AssemblyCore);
		const wasm = await WebAssembly.instantiate(await request.arrayBuffer(), { env: inst });

		inst.exports = wasm.instance.exports;
		inst.cpu_state = inst.exports.get_machine();
		inst.machineBytes = new Uint8Array(inst.exports.memory.buffer);
		inst.exports.set_sample_rate(inst.cpu_state, inst.audio.sampleRate);

		inst.state = struct(inst.exports.memory.buffer, inst.exports.get_description(), inst.cpu_state);

		inst.reset();

		return inst;
	}

	get running() {
		return this.runTimer !== null;
	}

	set running(v) {
		if (this.running == v) return ;

		if (v) {
			this.systemTime = Date.now();
			this.runTimer = setInterval(this.tick, 0);
		} else {
			clearInterval(this.runTimer);
			this.runTimer = null;
		}

		this.update();
	}

	tick = () => {
		if (!this.running) return ;

		let now = Date.now();
		let delta = Math.floor(Math.min(200, now - this.systemTime) * CPU_FREQ / 1000);

		this.systemTime = now;

		if (this.breakpoints.length) {
			this.state.clocks += delta;	// advance our clock

			while (this.state.clocks > 0) {
				if (this.breakpoints.indexOf(this.translate(this.state.cpu.pc)) >= 0) {
					this.running = false;
					break ;
				}

				this.exports.cpu_step(this.cpu_state);
			}
		} else {
			this.exports.cpu_advance(this.cpu_state, delta);
		}

		this.update();
	}

	// Trigger an update to the UI
	repaint(bytes:Uint8Array, address:number) {

	}

	update() {
		// This will be overidden elsewhere
	}

	private updateInput() {
		this.exports.update_inputs(this.cpu_state, this.inputState);
	}

	// Cartridge I/O
	load (ab) {
		var bytes = new Uint8Array(ab);
		var hasHeader = (bytes[0] != 0x50 || bytes[1] != 0x4D);
		var offset = hasHeader ? 0 : 0x2100;


		setTimeout(() => {
			for (let i = bytes.length - 1; i >= 0; i--) this.state.cartridge[(i+offset) & 0x1FFFFF] = bytes[i];
			this.inputState &= ~INPUT_CART_N;
			this.updateInput();
		}, 100);

		this.eject();
	}

	eject() {
		this.inputState |= INPUT_CART_N;
		this.updateInput();
	}

	audio_push = () => {
		this.audio.push(this.state.buffers.audio);
	}

	flip_screen = (contrast:number) => {
    this.repaint(this.state.buffers.framebuffer, contrast);
	}

	debug_print = (start:number) => {
		let utf8decoder = new TextDecoder();
		let end = this.machineBytes?.indexOf(0, start);

		const string = utf8decoder.decode(new Uint8Array(this.machineBytes.buffer, start, end - start));
    console.log(string);
	}

	trace_access = (cpu:number, address:number, kind:number, data:number) => {
	}

	// WASM shim functions
	translate(address:number) {
		if (address & 0x8000) {
			return (address & 0x7FFF) | (this.state.cpu.cb << 15);
		} else {
			return address;
		}
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
