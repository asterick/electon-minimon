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

#include <string.h>
#include "machine.h"

static const int SCREEN_WIDTH = 96;
static const int SCREEN_HEIGHT = 64;

union FrameBuffer
{
  uint8_t bytes[SCREEN_WIDTH][8];
  uint64_t column[SCREEN_WIDTH];
};

struct MapSize
{
  int width;
  int height;
};

static const MapSize MAP_SIZES[] = {
    {12, 16},
    {16, 12},
    {24, 8},
    {24, 16}};

static const int FRAME_DIVIDERS[] = {
    3, 6, 9, 12,
    2, 4, 6, 8};

static const uint8_t BIT_MASK[] = {
    0b00111111,
    0b00001111,
    0b11111000,
    0b11111111,
    0b00011111,
    0b01111111,
    0b01111111,
    0b11000000,
    0b11111111,
    0b00011111,
    0b00000000};

static inline uint64_t shift(uint64_t value, int offset)
{
  if (offset < 0)
  {
    return value >> -offset;
  }
  else
  {
    return value << offset;
  }
}

static inline int min(int a, int b)
{
  return (a < b) ? a : b;
}

static inline uint16_t rev(uint16_t a)
{
  a = ((a & 0b1010101010101010) >> 1) | ((a & 0b0101010101010101) << 1);
  a = ((a & 0b1100110011001100) >> 2) | ((a & 0b0011001100110011) << 2);
  a = ((a & 0b1111000011110000) >> 4) | ((a & 0b0000111100001111) << 4);
  a = ((a & 0b1111111100000000) >> 8) | ((a & 0b0000000011111111) << 8);

  return a;
}

void Blitter::reset(Machine::State &cpu)
{
  memset(&cpu.blitter, 0, sizeof(cpu.blitter));
}

void Blitter::clock(Machine::State &cpu)
{
  // Framerate divider
  if (++cpu.blitter.divider < FRAME_DIVIDERS[cpu.blitter.frame_divider])
  {
    return;
  }

  cpu.blitter.divider = 0;

  // Rendering loop
  FrameBuffer target;

  if (cpu.blitter.enable_map)
  {
    const MapSize &size = MAP_SIZES[cpu.blitter.map_size];
    int dx = min(cpu.blitter.scroll_x, size.width * 8 - SCREEN_WIDTH);
    int dy = min(cpu.blitter.scroll_y, size.height * 8 - SCREEN_HEIGHT);

    int y_fine = dy % 8;
    int y_tile = (dy / 8) * size.width;

    for (int x = 0; x < SCREEN_WIDTH; x++, dx++)
    {
      int x_fine = dx % 8;
      int x_tile = dx / 8;
      int address = y_tile + x_tile;

      target.column[x] = 0;

      for (int y = -y_fine; y < SCREEN_HEIGHT; y += 8, address += size.width)
      {
        uint8_t tile = cpu.overlay.map[address];
        auto tile_address = cpu.blitter.map_base + x_fine + tile * 8;
        uint8_t graphic = cpu_read8(cpu, tile_address, TRACE_TILE_DATA);

        target.column[x] |= shift(graphic, y);
      }
    }

    if (cpu.blitter.invert_map)
    {
      for (int x = 0; x < SCREEN_WIDTH; x++)
        target.column[x] = ~target.column[x];
    }
  }
  else
  {
    for (int x = 0; x < SCREEN_WIDTH; x++)
    {
      for (int y = 0; y < 8; y++)
      {
        target.bytes[x][y] = cpu.overlay.framebuffer[y][x];
      }
    }
  }

  if (cpu.blitter.enable_sprites)
  {
    for (int i = 23; i >= 0; i--)
    {
      uint8_t sprite_flags = cpu.overlay.oam[i][3];
      bool sprite_enable = sprite_flags & 0b1000;

      if (!sprite_enable)
        continue;

      uint8_t sprite_x = cpu.overlay.oam[i][0] & 0x7F;
      uint8_t sprite_y = cpu.overlay.oam[i][1] & 0x7F;
      uint8_t sprite_tile = cpu.overlay.oam[i][2];
      bool sprite_xflip = sprite_flags & 0b0001;
      bool sprite_yflip = sprite_flags & 0b0010;
      bool sprite_invert = sprite_flags & 0b0100;

      auto address = cpu.blitter.sprite_base + sprite_tile * (8 * 8);
      int dx = sprite_x - 16;
      int dy = sprite_y - 16;

      int invert = sprite_xflip ? 0b0100111 : 0;

      if (dy <= -16 || dy >= SCREEN_HEIGHT)
        continue;

      for (int s = 0; s < 2; s++)
      {
        for (int x = 0; x < 8; x++, address++, dx++)
        {
          // Offscreen
          if (dx >= SCREEN_WIDTH)
          {
            break;
          }
          else if (dx < 0)
          {
            continue;
          }

          uint16_t mask = cpu_read8(cpu, (address ^ invert) + 0, TRACE_SPRITE_DATA) | (cpu_read8(cpu, (address ^ invert) + 8, TRACE_SPRITE_DATA) << 8);
          uint16_t draw = cpu_read8(cpu, (address ^ invert) + 16, TRACE_SPRITE_DATA) | (cpu_read8(cpu, (address ^ invert) + 24, TRACE_SPRITE_DATA) << 8);

          if (sprite_yflip)
          {
            mask = rev(mask);
            draw = rev(draw);
          }

          if (sprite_invert)
          {
            draw = ~draw;
          }

          mask = ~mask;
          target.column[dx] &= ~shift(mask, dy);
          target.column[dx] |= shift(draw & mask, dy);
        }

        address += 24;
      }
    }
  }

  // Copy back to ram
  for (int x = 0; x < SCREEN_WIDTH; x++)
  {
    for (int y = 0; y < 8; y++)
    {
      cpu.overlay.framebuffer[y][x] = target.bytes[x][y];
    }
  }

  // Send to LCD
  if (cpu.blitter.enable_copy)
  {
    IRQ::trigger(cpu, IRQ::IRQ_BLT_COPY);

    for (int p = 0, a = 0; p < 8; p++)
    {
      LCD::write(cpu.lcd, 0b10110000 | p, 0x20FE);
      LCD::write(cpu.lcd, 0b00000000, 0x20FE);
      LCD::write(cpu.lcd, 0b00010000, 0x20FE);
      for (int x = 0; x < SCREEN_WIDTH; x++)
      {
        LCD::write(cpu.lcd, cpu.ram[a++], 0x20FF);
      }
    }
  }

  IRQ::trigger(cpu, IRQ::IRQ_BLT_OVERFLOW);
}

uint8_t Blitter::read(Machine::State &cpu, uint32_t address)
{
  switch (address)
  {
  case 0x2080:
    return 0 |
           (cpu.blitter.invert_map ? 0b0001 : 0) |
           (cpu.blitter.enable_map ? 0b0010 : 0) |
           (cpu.blitter.enable_sprites ? 0b0100 : 0) |
           (cpu.blitter.enable_copy ? 0b1000 : 0) |
           (cpu.blitter.map_size << 4);
  case 0x2081:
    return (cpu.blitter.frame_divider << 1) |
           (cpu.blitter.frame_count << 4) |
           (cpu.blitter.lcd_init ? 1 : 0);
  case 0x2085:
    return cpu.blitter.scroll_y;
  case 0x2086:
    return cpu.blitter.scroll_x;
  case 0x2082 ... 0x2084:
    return cpu.blitter.map_bytes[address - 0x2082];
  case 0x2087 ... 0x2089:
    return cpu.blitter.sprite_bytes[address - 0x2087];
  case 0x208A:
    return LCD::get_scanline(cpu.lcd);

  // 8B~8F, F0~F8 (These are probably related to Blitter / LCD)
  default:
    return 0;
  }
}

void Blitter::write(Machine::State &cpu, uint8_t data, uint32_t address)
{
  data &= BIT_MASK[address & 0xF];

  switch (address)
  {
  case 0x2080:
    cpu.blitter.invert_map = (data & 0b0001) != 0;
    cpu.blitter.enable_map = (data & 0b0010) != 0;
    cpu.blitter.enable_sprites = (data & 0b0100) != 0;
    cpu.blitter.enable_copy = (data & 0b1000) != 0;
    cpu.blitter.map_size = (data >> 4) & 0b11;
    break;
  case 0x2081:
    cpu.blitter.lcd_init = (data & 1) != 0;
    cpu.blitter.frame_divider = (data >> 1) & 0b111;
    break;
  case 0x2082 ... 0x2084:
    cpu.blitter.map_bytes[address - 0x2082] = data;
    break;
  case 0x2085:
    cpu.blitter.scroll_y = data;
    break;
  case 0x2086:
    cpu.blitter.scroll_x = data;
    break;
  case 0x2087 ... 0x2089:
    cpu.blitter.sprite_bytes[address - 0x2087] = data;
    break;
  }
}
