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

import Minimon from '.';
import * as Table from '../core/instructions';

function BIT(n:number) {
  return 1 << n;
}

export enum TraceAccess {
  NONE = 0,

  // Category: Access Type
  WORD_LO = BIT(0),
  WORD_HI = BIT(1),
  DATA = BIT(2),
  INSTRUCTION = BIT(3),
  EX_INST = BIT(4),
  IMMEDIATE = BIT(5),
  STACK = BIT(6),

  // Category: Argument type
  VECTOR = BIT(10),
  BRANCH_TARGET = BIT(11),
  OFFSET = BIT(12),

  // Category: Data type
  TILE_DATA = BIT(20),
  SPRITE_DATA = BIT(21),
  RETURN_ADDRESS = BIT(22),

  // Category: Access direction
  READ = BIT(30),
  WRITE = BIT(31),
}

export default class Tracer extends EventTarget {
  private tracedAccess:Uint32Array;
  private traceBank:Object;
  private dirty:boolean;

  constructor(system:Minimon) {
    super();

    this.tracedAccess = new Uint32Array(0x200000);
    this.dirty = true;
    this.traceBank = {
      bios: { dirty: true, data: system.state.bios, address: 0x0000, name: "System BIOS ($000000~$000FFF)" },
      ram:  { dirty: true, data: system.state.ram, address: 0x1000, name: "System RAM ($001000~$001FFF)" },
    };

    this.reset(system);
  }

  reset(system) {
    function formatAddress(address) {
      let extended = `000000${address.toString(16)}`;
      return extended.substring(extended.length - 6);
    }

    for (let address = 0x2100; address < 0x200000; address = (address + 0x8000) & ~0x7FFF) {
      let bank = address >> 15;
      let end = address | 0x7FFF;
      let name = `rom:${bank}`;

      this.traceBank[name] = {
        address,
        data: system.state.buffers.cartridge.subarray(address, end + 1),
        dirty: true,
        name: `ROM Bank ${bank} (\$${formatAddress(address)}~\$${formatAddress(end)})`
      };
    };

    for (let i = 0x1000; i < this.traceAccess.length; i++) {
      this.traceAccess[i] = TraceAccess.NONE;
    }

    // Prerender all pages so we don't get stampeded with events
    Object.keys(this.traceBank).forEach((bank) => this.render(bank));
  }

  getPages() {
    return Object.keys(this.traceBank).map((value) => ({ value, label: this.traceBank[value].name }))
  }

  render(bank) {
    if (!this.traceBank[bank].dirty) {
      return this.traceBank[bank].render;
    }

    this.traceBank[bank].dirty = false;
    let render = this.traceBank[bank].render = [];
    let { start, end, data } = this.traceBank[bank];

    function i8() { return data[start++] }
    function i16() { return i8() | (i8() << 8) }
    function s8() { return i8() << 24 >> 24 }
    function s16() { return i16() << 16 >> 16 }

    // TODO: GENERATE DISASSEMBLY / DATA BLOCKS HERE

    return render;
  }

  update() {
    if (!this.dirty) return ;
    this.dirty = false;


    const dirty = Object.keys(this.traceBank)
      .forEach((page) => {
        const bank = this.traceBank[page];
        if (!bank.dirty) return ;

        this.dispatchEvent(new CustomEvent(`trace:changed[${page}]`, { detail: bank }));
      });
  }

  traceAccess(cpu: number, address: number, kind: number, data: number) {
    const prev = this.tracedAccess[address];
    const mask = ~(TraceAccess.READ | TraceAccess.WRITE);

    // We do not need to trace register writes
    if (address >= 0x2000 && address <= 0x20FF) {
      return ;
    }

    // Trace accesses, with clear on write to ram
    if (kind & TraceAccess.WRITE) {
      if (address >= 0x2100) {
        return ;
      }

      this.tracedAccess[address] = kind & mask;
    } else {
      this.tracedAccess[address] |= kind & mask;
    }

    // Mark altered banks as dirty
    if (prev !== this.tracedAccess[address]) {
      let bank;

      if (address < 0x1000) {
        bank = "bios";
      } else if (address < 0x2000) {
        bank = "ram";
      } else {
        bank = `rom:${address >> 15}`;
      }

      this.traceBank[bank].dirty = this.dirty = true;
    }
  }
}
