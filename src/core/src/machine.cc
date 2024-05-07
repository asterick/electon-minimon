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

#include <stdint.h>

#include "machine.h"
#include "debug.h"

extern "C" const char *get_version()
{
  return "0.2.0";
}

extern "C" void cpu_initialize(Machine::State &cpu)
{
  cpu_reset(cpu);

  cpu.osc1_overflow = 0;
}

extern "C" void cpu_reset(Machine::State &cpu)
{
  Control::reset(cpu.ctrl);
  IRQ::reset(cpu);
  LCD::reset(cpu.lcd);
  RTC::reset(cpu);
  TIM256::reset(cpu);
  Blitter::reset(cpu);
  Timers::reset(cpu);
  Input::reset(cpu.input);
  GPIO::reset(cpu.gpio);
  Audio::reset(cpu.audio);

  // Load our reset vector
  cpu.reg.pc = cpu_read16(cpu, 2 * (int)IRQ::IRQ_RESET, TRACE_VECTOR);
  trace_access(cpu, calc_pc(cpu), TRACE_BRANCH_TARGET);

  cpu_writeSC(cpu, 0xC0);
  cpu.reg.ep = 0xFF;
  cpu.reg.xp = 0x00;
  cpu.reg.yp = 0x00;
  cpu.reg.nb = 0x01;

  cpu.status = Machine::STATUS_NORMAL;
}

extern "C" void update_inputs(Machine::State &cpu, uint16_t value)
{
  Input::update(cpu, value);
}

extern "C" void set_sample_rate(Machine::State &cpu, int rate)
{
  Audio::setSampleRate(cpu.audio, rate);
}

void cpu_clock(Machine::State &cpu, int cycles)
{
  const int osc3 = cycles * OSC3_SPEED / CPU_SPEED;
  int osc1 = 0;

  cpu.osc1_overflow += osc3 * OSC1_SPEED;

  if (cpu.status <= Machine::STATUS_HALTED)
  {
    LCD::clock(cpu, osc3);
    Timers::clock(cpu, osc1, osc3);
    Audio::clock(cpu, osc3);

    if (cpu.osc1_overflow >= OSC3_SPEED)
    {
      // Assume we are not going to get more than a couple ticks out of this thing
      do
      {
        cpu.osc1_overflow -= OSC3_SPEED;
        osc1++;
      } while (cpu.osc1_overflow >= OSC3_SPEED);

      // These are the devices that only advance with OSC3
      TIM256::clock(cpu, osc1);
      RTC::clock(cpu, osc1);
    }
    else
    {
      osc1 = 0;
    }
  }

  // OSC3 = 4mhz oscillator, OSC1 = 32khz oscillator
  cpu.clocks -= osc3;
}

extern "C" void cpu_step(Machine::State &cpu)
{
  // We have an IRQ Scheduled
  IRQ::manage(cpu);

  // CPU Core steps
  if (cpu.status == Machine::STATUS_NORMAL)
  {
    cpu_clock(cpu, inst_advance(cpu));
  }
  else
  {
    // Eat a cycle
    cpu_clock(cpu, 1);
  }
}

extern "C" void cpu_advance(Machine::State &cpu, int ticks)
{
  cpu.clocks += ticks;

  while (cpu.clocks > 0)
  {
    cpu_step(cpu);
  }
}

static inline uint8_t cpu_read_reg(Machine::State &cpu, uint32_t address)
{
  switch (address)
  {
  case 0x2000 ... 0x2002:
    return Control::read(cpu.ctrl, address);
  case 0x2008 ... 0x200B:
    return RTC::read(cpu, address);
  case 0x2020 ... 0x202A:
    return IRQ::read(cpu, address);
  case 0x2040 ... 0x2041:
    return TIM256::read(cpu, address);
  case 0x2050 ... 0x2055:
    return Input::read(cpu.input, address);
  case 0x2060 ... 0x2062:
    return GPIO::read(cpu.gpio, address);
  case 0x2070 ... 0x2071:
    return Audio::read(cpu.audio, address);
  case 0x2010:
    // This should be handled properly
    return 0b010000;
  case 0x20FE ... 0x20FF:
    if (Control::is_lcd_enabled(cpu.ctrl))
    {
      return LCD::read(cpu.lcd, address);
    }
    else
    {
      return cpu.bus_cap;
    }
    break;
  case 0x2080 ... 0x208F:
  case 0x20F0 ... 0x20F8:
    return Blitter::read(cpu, address);
  case 0x2018 ... 0x201D:
  case 0x2030 ... 0x203F:
  case 0x2048 ... 0x204F:
    return Timers::read(cpu, address);
  default:
    dprintf("Unhandled register read %x", address);
    return cpu.bus_cap;
  }
}

static inline void cpu_write_reg(Machine::State &cpu, uint8_t data, uint32_t address)
{
  switch (address)
  {
  case 0x2000 ... 0x2002:
    Control::write(cpu.ctrl, data, address);
    break;
  case 0x2008 ... 0x200B:
    RTC::write(cpu, data, address);
    break;
  case 0x2020 ... 0x202A:
    IRQ::write(cpu, data, address);
    break;
  case 0x2040 ... 0x2041:
    TIM256::write(cpu, data, address);
    break;
  case 0x2050 ... 0x2055:
    Input::write(cpu.input, data, address);
    break;
  case 0x2060 ... 0x2062:
    GPIO::write(cpu.gpio, data, address);
    break;
  case 0x2070 ... 0x2071:
    Audio::write(cpu.audio, data, address);
    break;
  case 0x2080 ... 0x208A:
    Blitter::write(cpu, data, address);
    break;
  case 0x20FE ... 0x20FF:
    if (Control::is_lcd_enabled(cpu.ctrl))
    {
      LCD::write(cpu.lcd, data, address);
    }
    break;
  case 0x2018 ... 0x201D:
  case 0x2030 ... 0x203F:
  case 0x2048 ... 0x204F:
    Timers::write(cpu, data, address);
    break;
  default:
    dprintf("Unhandled register write %x: %x", address, data);
    break;
  }
}

static inline uint8_t cpu_read_cart(Machine::State &cpu, uint32_t address)
{
  return cpu.buffers.cartridge[address % sizeof(cpu.buffers.cartridge)];
}

static inline void cpu_write_cart(Machine::State &cpu, uint8_t data, uint32_t address)
{
}

extern "C" uint8_t cpu_read(Machine::State &cpu, uint32_t address)
{
  if (address <= 0x0FFF)
  {
    return cpu.bus_cap = cpu.buffers.bios[address];
  }
  else if (address <= 0x1FFF)
  {
    return cpu.bus_cap = cpu.ram[address & 0xFFF];
  }
  else if (address <= 0x20FF)
  {
    return cpu.bus_cap = cpu_read_reg(cpu, address);
  }
  else if (Control::is_cart_enabled(cpu.ctrl))
  {
    return cpu.bus_cap = cpu_read_cart(cpu, address);
  }
  else
  {
    return cpu.bus_cap;
  }
}

extern "C" void cpu_write(Machine::State &cpu, uint8_t data, uint32_t address)
{
  cpu.bus_cap = data;

  if (address >= 0x1000 && address <= 0x1FFF)
  {
    cpu.ram[address & 0xFFF] = data;
  }
  else if (address >= 0x2000 && address <= 0x20FF)
  {
    cpu_write_reg(cpu, data, address);
  }
  else if (address >= 0x2100 && Control::is_cart_enabled(cpu.ctrl))
  {
    cpu_write_cart(cpu, data, address);
  }
}

/**
 * S1C88 Memory access helper functions
 **/
static TraceType operator|(TraceType A, TraceType B)
{
  return static_cast<TraceType>(static_cast<uint32_t>(A) | static_cast<uint32_t>(B));
}

uint8_t cpu_read8(Machine::State &cpu, uint32_t address, TraceType access)
{
  cpu.bus_cap = cpu_read(cpu, address);
  trace_access(cpu, address, access | TRACE_READ);
  return cpu.bus_cap;
}

void cpu_write8(Machine::State &cpu, uint8_t data, uint32_t address, TraceType access)
{
  trace_access(cpu, address, access | TRACE_WRITE);
  cpu_write(cpu, cpu.bus_cap = data, address);
}

uint16_t cpu_read16(Machine::State &cpu, uint32_t address, TraceType access)
{
  uint16_t lo = cpu_read8(cpu, address, access | TRACE_WORD_LO);
  address = ((address + 1) & 0xFFFF) | (address & 0xFF0000);
  return (cpu_read8(cpu, address, access | TRACE_WORD_HI) << 8) | lo;
}

void cpu_write16(Machine::State &cpu, uint16_t data, uint32_t address, TraceType access)
{
  cpu_write8(cpu, (uint8_t)data, address, access | TRACE_WORD_LO);
  address = ((address + 1) & 0xFFFF) | (address & 0xFF0000);
  cpu_write8(cpu, data >> 8, address, access | TRACE_WORD_HI);
}

uint8_t cpu_imm8(Machine::State &cpu, TraceType access)
{
  auto address = calc_pc(cpu);
  cpu.reg.pc++;

  return cpu_read8(cpu, address, access | TRACE_IMMEDIATE);
}

uint16_t cpu_imm16(Machine::State &cpu, TraceType access)
{
  uint8_t lo = cpu_imm8(cpu, access | TRACE_WORD_LO);
  return (cpu_imm8(cpu, access | TRACE_WORD_HI) << 8) | lo;
}

void cpu_push8(Machine::State &cpu, uint8_t t, TraceType access)
{
  cpu_write8(cpu, t, --cpu.reg.sp, access | TRACE_STACK);
}

uint8_t cpu_pop8(Machine::State &cpu, TraceType access)
{
  return cpu_read8(cpu, cpu.reg.sp++, access | TRACE_STACK);
}

void cpu_push16(Machine::State &cpu, uint16_t t, TraceType access)
{
  cpu_push8(cpu, t >> 8, access | TRACE_WORD_HI);
  cpu_push8(cpu, (uint8_t)t, access | TRACE_WORD_LO);
}

uint16_t cpu_pop16(Machine::State &cpu, TraceType access)
{
  uint16_t t = cpu_pop8(cpu, access | TRACE_WORD_LO);
  return (cpu_pop8(cpu, access | TRACE_WORD_HI) << 8) | t;
}

uint8_t cpu_readSC(Machine::State &cpu)
{
  return (cpu.reg.flag.z ? 0b000001 : 0) | (cpu.reg.flag.c ? 0b000010 : 0) | (cpu.reg.flag.v ? 0b000100 : 0) | (cpu.reg.flag.n ? 0b001000 : 0) | (cpu.reg.flag.d ? 0b010000 : 0) | (cpu.reg.flag.u ? 0b100000 : 0) | ((cpu.reg.flag.i & 0b11) << 6);
}

void cpu_writeSC(Machine::State &cpu, uint8_t data)
{
  cpu.reg.flag.z = (data & 0b000001) != 0;
  cpu.reg.flag.c = (data & 0b000010) != 0;
  cpu.reg.flag.v = (data & 0b000100) != 0;
  cpu.reg.flag.n = (data & 0b001000) != 0;
  cpu.reg.flag.d = (data & 0b010000) != 0;
  cpu.reg.flag.u = (data & 0b100000) != 0;
  cpu.reg.flag.i = data >> 6;
}
