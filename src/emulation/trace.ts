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

const MAX_DATA_WORDS = 5;
const MAX_DATA_BYTES = 10;
const IllegalInstruction = 'NDEF';

const BreakInstructions = [
  'CALL',
  'CARS',
  'CARL',
  'JRS',
  'JRL',
  'JP',
  'DJR',
  'RET', 'RETS', 'RETI',
  IllegalInstruction,
];

const Conditions = {
  [Table.Condition.LESS_THAN]: 'LT',
  [Table.Condition.LESS_EQUAL]: 'LE',
  [Table.Condition.GREATER_THAN]: 'GT',
  [Table.Condition.GREATER_EQUAL]: 'LE',
  [Table.Condition.OVERFLOW]: 'V',
  [Table.Condition.NOT_OVERFLOW]: 'NV',
  [Table.Condition.POSITIVE]: 'P',
  [Table.Condition.MINUS]: 'M',
  [Table.Condition.CARRY]: 'C',
  [Table.Condition.NOT_CARRY]: 'NC',
  [Table.Condition.ZERO]: 'Z',
  [Table.Condition.NOT_ZERO]: 'NZ',
  [Table.Condition.SPECIAL_FLAG_0]: 'F0',
  [Table.Condition.SPECIAL_FLAG_1]: 'F1',
  [Table.Condition.SPECIAL_FLAG_2]: 'F2',
  [Table.Condition.SPECIAL_FLAG_3]: 'F3',
  [Table.Condition.NOT_SPECIAL_FLAG_0]: 'NF0',
  [Table.Condition.NOT_SPECIAL_FLAG_1]: 'NF1',
  [Table.Condition.NOT_SPECIAL_FLAG_2]: 'NF2',
  [Table.Condition.NOT_SPECIAL_FLAG_3]: 'NF3',
};

const HTMLComma = "<span class='symbol'>,</span> ";

function BIT(n: number) {
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

function format(v, d = 2) {
  const o = `00000${v.toString(16).toUpperCase()}`;
  return `${o.substring(o.length - d)}`;
}

export default class Tracer extends EventTarget {
  private trace: Uint32Array;

  private traceBank: Object;

  private dirty: Object;

  private labels: Object;

  constructor(system: Minimon) {
    super();

    this.trace = new Uint32Array(0x200000);
    this.dirty = {};
    this.labels = {};

    this.traceBank = {
      bios: {
        dirty: true,
        data: system.state.buffers.bios,
        address: 0x0000,
        name: 'System BIOS (0000000h~0000FFFh)',
      },
      ram: {
        dirty: true,
        data: system.state.ram,
        address: 0x1000,
        name: 'System RAM (0001000h~0001FFFh)',
      },
    };

    this.reset(system);
  }

  reset(system) {
    for (
      let address = 0x2100;
      address < 0x200000;
      address = (address + 0x8000) & ~0x7fff
    ) {
      const bank = address >> 15;
      const end = address | 0x7fff;
      const name = `rom:${bank}`;

      this.traceBank[name] = {
        address,
        data: system.state.buffers.cartridge.subarray(address, end + 1),
        dirty: true,
        name: `ROM Bank ${bank} (${format(address, 6)}~${format(end, 6)})`,
      };
    }

    for (let i = 0x1000; i < this.trace.length; i++) {
      this.trace[i] = TraceAccess.NONE;
    }
  }

  getPages() {
    return Object.keys(this.traceBank).map((value) => ({
      value,
      label: this.traceBank[value].name,
    }));
  }

  render(page) {
    const bank = this.traceBank[page];

    if (!bank.dirty) {
      return bank.render;
    }

    bank.dirty = false;
    const render = (bank.render = []);
    let { address, data } = bank;
    let index = 0;
    let jumpPage = (address & ~0x7fff);

    function i8() {
      return address++, data[index++];
    }
    function i16() {
      return i8() | (i8() << 8);
    }
    function s8() {
      return (i8() << 24) >> 24;
    }
    function s16() {
      return (i16() << 16) >> 16;
    }

    const pcRelative = (v) => {
      const rel = (v & 0x8000) ? (jumpPage | (v & 0x7fff)) : v;
      console.log(jumpPage.toString(16), (v & 0x7fff).toString(16),rel.toString(16))

      if (this.labels[rel]) {
        return `<span class="identifier" data-address="${rel}">${this.labels[rel]}</span>`;
      }
      return `<span class="literal" data-address="${rel}">#${format(rel,6)}h</literal>`;
    };

    function signed(val) {
      if (val > 0) {
        return `+${val}`;
      }
      return val.toString();
    }

    function arg(arg) {
      let val;

      switch (arg) {
        case Table.Argument.REGS_ALL:
          return '<span class="register">ALL</span>';
        case Table.Argument.REGS_ALE:
          return '<span class="register">ALE</span>';
        case Table.Argument.REG_A:
          return '<span class="register">A</span>';
        case Table.Argument.REG_B:
          return '<span class="register">B</span>';
        case Table.Argument.REG_L:
          return '<span class="register">L</span>';
        case Table.Argument.REG_H:
          return '<span class="register">H</span>';
        case Table.Argument.REG_BA:
          return '<span class="register">BA</span>';
        case Table.Argument.REG_HL:
          return '<span class="register">HL</span>';
        case Table.Argument.REG_IX:
          return '<span class="register">IX</span>';
        case Table.Argument.REG_IY:
          return '<span class="register">IY</span>';
        case Table.Argument.REG_NB:
          return '<span class="register">NB</span>';
        case Table.Argument.REG_BR:
          return '<span class="register">BR</span>';
        case Table.Argument.REG_EP:
          return '<span class="register">EP</span>';
        case Table.Argument.REG_IP:
          return '<span class="register">IP</span>';
        case Table.Argument.REG_XP:
          return '<span class="register">XP</span>';
        case Table.Argument.REG_YP:
          return '<span class="register">YP</span>';
        case Table.Argument.REG_SC:
          return '<span class="register">SC</span>';
        case Table.Argument.REG_SP:
          return '<span class="register">SP</span>';
        case Table.Argument.REG_PC:
          return '<span class="register">PC</span>';
        case Table.Argument.MEM_HL:
          return '<span class="symbol">[</span><span class="register">HL</span><span class="symbol">]</span>';
        case Table.Argument.MEM_IX:
          return '<span class="symbol">[</span><span class="register">IX</span><span class="symbol">]</span>';
        case Table.Argument.MEM_IY:
          return '<span class="symbol">[</span><span class="register">IY</span><span class="symbol">]</span>';
        case Table.Argument.MEM_IX_OFF:
          return '<span class="symbol">[</span><span class="register">IX</span><span class="symbol">+</span><span class="register">L</span><span class="symbol">]</span>';
        case Table.Argument.MEM_IY_OFF:
          return '<span class="symbol">[</span><span class="register">IY</span><span class="symbol">+</span><span class="register">L</span><span class="symbol">]</span>';
        case Table.Argument.MEM_SP_DISP:
          return `[SP${signed(s8())}]`;
        case Table.Argument.MEM_IX_DISP:
          return `[IX${signed(s8())}]`;
        case Table.Argument.MEM_IY_DISP:
          return `[IY${signed(s8())}]`;
        case Table.Argument.MEM_ABS16:
          return `<span class="symbol">[</span><span class="literal">0${format(i16(), 4)}h</span><span class="symbol">]</span>`;
        case Table.Argument.MEM_BR:
          return `<span class="symbol">[</span><span class="register">BR</span><span class="symbol">:</span><span class="literal">0${format(i8())}h</span><span class="symbol">]</span>`;
        case Table.Argument.MEM_VECTOR:
          return `<span class="symbol">[</span><span class="literal">0${format(i8())}h</span><span class="symbol">]</span>`;
        case Table.Argument.IMM_8:
          return `<span class="literal">#0${format(i8())}h</span>`;
        case Table.Argument.IMM_16:
          return `<span class="literal">#0${format(i16(), 4)}h</span>`;
        case Table.Argument.REL_8:
          return pcRelative(address + s8());
        case Table.Argument.REL_16:
          return pcRelative(address + s16());
      }
    }

    let trace = this.trace[address];
    jumpPage = address & ~0x7FFF;
    while (index < data.length) {
      if (trace & TraceAccess.INSTRUCTION) {
        let terminate = false;

        do {
          const startAddress = address;
          const startIndex = index;

          // Pull opcode out of table
          let opcode = Table.InstructionTable;
          do {
            opcode = opcode[i8()];
          } while (Array.isArray(opcode));

          let operation;
          let parameters;

          if (opcode) {
            const { op, condition, args } = opcode;

            operation = op;
            parameters = args.map(arg);

            if (condition !== Table.Condition.NONE) {
              parameters.unshift(
                `<span class="condition">${Conditions[opcode.condition]}</span>`,
              );
            }


            if (index > data.length) {
              operation = IllegalInstruction;
              parameters = [];
              index = data.length;
              terminate = true;
            } else if (BreakInstructions.indexOf(operation) >= 0) {
              terminate = true;
            } else {
              if (operation === "LD" && args[0] == Table.Argument.REG_NB && args[1] == Table.Argument.IMM_8) {
                jumpPage = data[index-1] << 15;
              } else {
                jumpPage = address & ~0x7FFF;
              }
            }
          } else {
            operation = IllegalInstruction;
            parameters = [];
            terminate = true;
          }

          // Format raw data
          const raw = [];
          for (let i = startIndex; i < index; i++) {
            raw.push(format(data[i]));
          }

          render.push({
            operation,
            address: startAddress,
            parameters: parameters.join(HTMLComma),
            raw: raw.join(' '),
          });

          trace = this.trace[address];
        } while (index < data.length && !terminate);
      } else if (data.length - index >= 2 && trace & TraceAccess.WORD_LO) {
        const startAddress = address;
        const parameters = [];

        // Unroll word data
        do {
          const wordAddr = address;
          const word = i16();

          if (trace & TraceAccess.VECTOR && this.labels[word]) {
            parameters.push(
              `<span class="identifier" data-address="${wordAddr}">${this.labels[word]}</span>`,
            );
          } else {
            parameters.push(
              `<span class="literal" data-address="${wordAddr}">0${format(word, 4)}h</span>`,
            );
          }

          trace = this.trace[address];
        } while (
          parameters.length < MAX_DATA_WORDS &&
          data.length - index >= 2 &&
          !this.labels[address] &&
          trace & TraceAccess.WORD_LO
        );

        render.push({
          operation: 'DW',
          address: startAddress,
          parameters: parameters.join(HTMLComma),
        });
      } else {
        const startAddress = address;
        const parameters = [];

        do {
          const wordAddr = address;
          parameters.push(
            `<span class="literal" data-address="${wordAddr}">0${format(i8())}h</span>`,
          );
          trace = this.trace[address];
        } while (
          parameters.length < MAX_DATA_BYTES &&
          index < data.length &&
          !this.labels[address] &&
          !(
            this.trace[address] &
            (TraceAccess.WORD_LO | TraceAccess.INSTRUCTION)
          )
        );
        render.push({
          operation: 'DB',
          address: startAddress,
          parameters: parameters.join(HTMLComma),
        });
      }
    }

    render.forEach((block) => {
      if (this.labels[block.address]) block.label = this.labels[block.address];
    });

    return render;
  }

  update() {
    Object.keys(this.traceBank).forEach((page) => {
      const detail = this.traceBank[page];
      this.dispatchEvent(new CustomEvent(`trace:changed[${page}]`, { detail }));
    });
    this.dirty = {};
  }

  forceTrace(address: number, kind: number) {
    const mask = ~(TraceAccess.READ | TraceAccess.WRITE);

    // Trace accesses, with clear on write to ram
    this.trace[address] = kind & mask;

    // Mark altered banks as dirty
    let bank;

    if (address < 0x1000) {
      bank = 'bios';
    } else if (address < 0x2000) {
      bank = 'ram';
    } else {
      bank = `rom:${address >> 15}`;
    }

    this.traceBank[bank].dirty = true;

    const detail = this.traceBank[bank];
    this.dispatchEvent(new CustomEvent(`trace:changed[${bank}]`, { detail }));
  }

  traceAccess(cpu: number, address: number, kind: number, data: number) {
    const prev = this.trace[address];
    const mask = ~(TraceAccess.READ | TraceAccess.WRITE);

    // We do not need to trace register writes
    if (address >= 0x2000 && address <= 0x20ff) {
      return;
    }

    // Trace accesses, with clear on write to ram
    if (kind & TraceAccess.WRITE) {
      if (address >= 0x2100) {
        return;
      }

      this.trace[address] = kind & mask;
    } else {
      this.trace[address] |= kind & mask;
    }

    if (
      kind & TraceAccess.BRANCH_TARGET &&
      this.labels[address] === undefined
    ) {
      this.labels[address] = `loc_${address.toString(16)}`;
    }

    // Mark altered banks as dirty
    if (prev !== this.trace[address]) {
      let bank;

      if (address < 0x1000) {
        bank = 'bios';
      } else if (address < 0x2000) {
        bank = 'ram';
      } else {
        bank = `rom:${address >> 15}`;
      }

      this.traceBank[bank].dirty = this.dirty[bank] = true;
    }
  }
}
