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

const MAX_DATA_WORDS = 8;
const MAX_DATA_BYTES = 16;
const IllegalInstruction = "illegal"

const BreakInstructions = [
	"CARS",	"JRS",	"CARL",	"JRL",	"JP",	"DJR", IllegalInstruction
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
  private trace:Uint32Array;
  private traceBank:Object;
  private dirty:Object;
  private labels:Object;

  constructor(system:Minimon) {
    super();

    this.trace = new Uint32Array(0x200000);
    this.dirty = {};
    this.labels = {};

    this.traceBank = {
      bios: { dirty: true, data: system.state.buffers.bios, address: 0x0000, name: "System BIOS ($000000~$000FFF)" },
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

    for (let i = 0x1000; i < this.trace.length; i++) {
      this.trace[i] = TraceAccess.NONE;
    }
  }

  getPages() {
    return Object.keys(this.traceBank).map((value) => ({ value, label: this.traceBank[value].name }))
  }

  render(page) {
    const bank = this.traceBank[page];

    if (!bank.dirty) {
      return bank.render;
    }

    bank.dirty = false;
    let render = bank.render = [];
    let { address, data } = bank;
    let index = 0;

    function i8() { return address++, data[index++] }
    function i16() { return i8() | (i8() << 8) }
    function s8() { return i8() << 24 >> 24 }
    function s16() { return i16() << 16 >> 16 }

    function pcRelative(v) {
      if (v & 0x8000) {
        return (address & ~0x7FFF) | (v & 0x7FFF);
      } else {
        return v;
      }
    }

    function format(i, d) {
      return i.toString(16).toUpperCase();
    }

    function arg(arg) {
      let val;

      switch (arg) {
        case Table.Argument.REGS_ALL: return 'ALL';
        case Table.Argument.REGS_ALE: return 'ALE';
        case Table.Argument.REG_A: return 'A';
        case Table.Argument.REG_B: return 'B';
        case Table.Argument.REG_L: return 'L';
        case Table.Argument.REG_H: return 'H';
        case Table.Argument.REG_BA: return 'BA';
        case Table.Argument.REG_HL: return 'HL';
        case Table.Argument.REG_IX: return 'IX';
        case Table.Argument.REG_IY: return 'IY';
        case Table.Argument.REG_NB: return 'NB';
        case Table.Argument.REG_BR: return 'BR';
        case Table.Argument.REG_EP: return 'EP';
        case Table.Argument.REG_IP: return 'IP';
        case Table.Argument.REG_XP: return 'XP';
        case Table.Argument.REG_YP: return 'YP';
        case Table.Argument.REG_SC: return 'SC';
        case Table.Argument.REG_SP: return 'SP';
        case Table.Argument.REG_PC: return 'PC';
        case Table.Argument.MEM_HL: return '[HL]';
        case Table.Argument.MEM_IX: return '[IX]';
        case Table.Argument.MEM_IY: return '[IY]';
        case Table.Argument.MEM_IX_OFF: return '[IX+L]';
        case Table.Argument.MEM_IY_OFF: return '[IY+L]';
        case Table.Argument.MEM_SP_DISP:
          val = s8();
          return `[SP${val > 0 ? '+' : ''}${val}]`;
        case Table.Argument.MEM_IX_DISP:
          val = s8();
          return `[IX${val > 0 ? '+' : ''}${val}]`;
        case Table.Argument.MEM_IY_DISP:
          val = s8();
          return `[IY${val > 0 ? '+' : ''}${val}]`;
        case Table.Argument.MEM_ABS16: return `[${format(i16(), 4)}h]`;
        case Table.Argument.MEM_BR: return `[BR:${format(i8(), 2)}h]`;
        case Table.Argument.MEM_VECTOR: return `[${format(i8(), 2)}h]`;
        case Table.Argument.IMM_8: return `#x${i8().toString(16).toUpperCase()}h`;
        case Table.Argument.IMM_16: return `#y${i16().toString(16).toUpperCase()}h`;
        case Table.Argument.REL_8: return pcRelative(s8());
        case Table.Argument.REL_16: return pcRelative(s16());
      }
    }

    let trace = this.trace[address];
    while (index < data.length) {
      if (trace & TraceAccess.INSTRUCTION) {
        // TOOD: THIS SHOULD CHECK IF INSTRUCTION WILL CROSS INTO NEXT PAGE
        // Generate instructions (until reaching a branch)
        do {
          const startAddress = address;
          const startIndex = index;

          // Pull opcode out of table
          let opcode = Table.InstructionTable;
          while (Array.isArray(opcode)) opcode = Table.InstructionTable[i8()];

          let operation;
          let parameters;

          if (opcode) {
            const { op, condition, args } = opcode;

            operation = op;
            parameters = args.map(arg);

            if (condition !== Table.Condition.NONE) parameters.unshift(Conditions[opcode.condition]);

            if (index > data.length) {
              operation = IllegalInstruction;
              parameters = [];
              index = data.length;
            }
          } else {
            operation = IllegalInstruction;
            parameters = [];
          }

          // Format raw data
          let raw = [];
          for (let i = startIndex; i < index; i++) {
            raw.push(format(data[i], 2));
          }

          trace = this.trace[address];;

          render.push({ operation, startAddress, parameters, raw });

          if (BreakInstructions.indexOf(opcode) >= 0) break ;
        } while (index < data.length);
      } else if (data.length - index >= 2 && trace & TraceAccess.WORD_LO) {
        const startAddress = address;
        const parameters = [];

        // Unroll word data
        do {
          const word = i16();

          if (trace & TraceAccess.VECTOR && this.labels[word]) {
            parameters.push(this.labels[word])
          } else {
            parameters.push(`\$${format(word, 4)}`);
          }

          trace = this.trace[address];
        } while (parameters.length < MAX_DATA_WORDS && data.length - index >= 2 && !this.labels[address] && (trace & TraceAccess.WORD_LO));

        render.push({ operation: "DW", address: startAddress, parameters });
      } else {
        const startAddress = address;
        const parameters = [];

        do {
          parameters.push(`\$${format(i8(), 2)}`);
          trace = this.trace[address];
        } while (parameters.length < MAX_DATA_BYTES && index < data.length && !this.labels[address] && !(this.trace[address] & (TraceAccess.WORD_LO | TraceAccess.INSTRUCTION)));
        render.push({ operation: "DB", address: startAddress, parameters });
      }
    }

    render.forEach((block) => { if (this.labels[block.startAddress]) block.label = this.labels[block.startAddress] })
    console.log(render);

    return render;
  }

  update() {
    Object.keys(this.traceBank)
      .forEach((page) => {
        const detail = this.traceBank[page];
        this.dispatchEvent(new CustomEvent(`trace:changed[${page}]`, { detail }));
      });
      this.dirty = {};
    }

  traceAccess(cpu: number, address: number, kind: number, data: number) {
    const prev = this.trace[address];
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

      this.trace[address] = kind & mask;
    } else {
      this.trace[address] |= kind & mask;
    }

    if (kind & TraceAccess.BRANCH_TARGET && this.labels[address] === undefined) {
      this.labels[address] = `loc_${address.toString(16)}`;
    }

    // Mark altered banks as dirty
    if (prev !== this.trace[address]) {
      let bank;

      if (address < 0x1000) {
        bank = "bios";
      } else if (address < 0x2000) {
        bank = "ram";
      } else {
        bank = `rom:${address >> 15}`;
      }

      this.traceBank[bank].dirty = this.dirty[bank] = true;
    }
  }
}
