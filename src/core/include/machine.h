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

#pragma once

#include <stdint.h>
#include <stdbool.h>

namespace Machine
{
  struct State;
};

#include "lcd.h"
#include "irq.h"
#include "tim256.h"
#include "timers.h"
#include "rtc.h"
#include "blitter.h"
#include "control.h"
#include "input.h"
#include "eeprom.h"
#include "gpio.h"
#include "audio.h"
#include "tracing.h"

const auto OSC1_SPEED = 32768;
const auto OSC3_SPEED = 4000000;
const auto TICK_SPEED = 1000;
const auto CPU_SPEED = 1000000;

namespace CPU
{
  struct State
  {
    struct
    {
      bool z;
      bool c;
      bool v;
      bool n;
      bool d;
      bool u;
      uint8_t i;

      bool f0;
      bool f1;
      bool f2;
      bool f3;
    } flag;

    union
    {
      struct
      {
        uint8_t a;
        uint8_t b;
        uint8_t l;
        uint8_t h;
      };

      struct
      {
        uint16_t ba;
        uint16_t hl;
      };
    };

    uint16_t pc;
    uint16_t sp;
    uint16_t ix;
    uint16_t iy;

    uint8_t br;
    uint8_t ep;
    uint8_t xp;
    uint8_t yp;

    uint8_t cb;
    uint8_t nb;
  };
};

namespace Machine
{
  enum Status : uint8_t
  {
    STATUS_NORMAL,
    STATUS_HALTED,
    STATUS_SLEEPING,
    STATUS_CRASHED
  };

  struct Buffers
  {
    // Raw cartridge data
    uint8_t cartridge[0x200000];
    uint8_t bios[0x1000];

    // Runtime interface buffers
    float audio[AUDIO_BUFFER_LENGTH];
    uint8_t lcd_shift[LCD_HEIGHT][LCD_WIDTH];
    uint32_t framebuffer[LCD_HEIGHT][LCD_WIDTH];
    uint32_t palette[0x100];
    float weights[0x100];
  };

  struct State
  {
    CPU::State reg;
    IRQ::State irq;
    LCD::State lcd;
    RTC::State rtc;
    Control::State ctrl;
    TIM256::State tim256;
    Blitter::State blitter;
    Timers::State timers;
    Input::State input;
    GPIO::State gpio;
    Audio::State audio;

    uint8_t bus_cap;
    int clocks;
    int osc1_overflow;
    Status status;

    union
    {
      uint8_t ram[0x1000];
      Blitter::Overlay overlay;
    };

    Buffers buffers;
  };
}

// Library functions
extern "C" Machine::State *const get_machine();

extern "C" uint8_t cpu_read(Machine::State &cpu, uint32_t address);
extern "C" void cpu_write(Machine::State &cpu, uint8_t data, uint32_t address);

extern "C" void cpu_step(Machine::State &cpu);
extern "C" void cpu_advance(Machine::State &cpu, int ticks);

// Bridge functions
extern "C" void cpu_initialize(Machine::State &cpu);
extern "C" void cpu_reset(Machine::State &cpu);
extern "C" void cpu_advance(Machine::State &cpu, int ticks);
extern "C" void set_sample_rate(Machine::State &cpu, int rate);
extern "C" void update_inputs(Machine::State &cpu, uint16_t value);
extern "C" const char *get_version();

// Clock management
void cpu_clock(Machine::State &cpu, int cycles);
int inst_advance(Machine::State &cpu);

// These are memory access helpers
uint8_t cpu_readSC(Machine::State &cpu);
void cpu_writeSC(Machine::State &cpu, uint8_t data);

uint8_t cpu_read8(Machine::State &cpu, uint32_t address, TraceType access = TRACE_NONE);
void cpu_write8(Machine::State &cpu, uint8_t data, uint32_t address, TraceType access = TRACE_NONE);
uint16_t cpu_read16(Machine::State &cpu, uint32_t address, TraceType access = TRACE_NONE);
void cpu_write16(Machine::State &cpu, uint16_t data, uint32_t address, TraceType access = TRACE_NONE);
uint8_t cpu_imm8(Machine::State &cpu, TraceType access = TRACE_NONE);
uint16_t cpu_imm16(Machine::State &cpu, TraceType access = TRACE_NONE);
void cpu_push8(Machine::State &cpu, uint8_t t, TraceType access = TRACE_NONE);
uint8_t cpu_pop8(Machine::State &cpu, TraceType access = TRACE_NONE);
void cpu_push16(Machine::State &cpu, uint16_t t, TraceType access = TRACE_NONE);
uint16_t cpu_pop16(Machine::State &cpu, TraceType access = TRACE_NONE);

static inline uint32_t calc_pc(Machine::State &cpu)
{
  uint16_t address = cpu.reg.pc;

  if (address & 0x8000)
  {
    return (cpu.reg.cb << 15) | (address & 0x7FFF);
  }
  else
  {
    return address;
  }
}
