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

namespace Machine
{
  struct State;
};

namespace Blitter
{
  struct Overlay
  {
    uint8_t framebuffer[8][96];
    uint8_t oam[24][4];
    uint8_t map[384];
  };

  struct State
  {
    bool lcd_init;
    bool invert_map;
    bool enable_map;
    bool enable_sprites;
    bool enable_copy;
    uint8_t map_size;
    uint8_t frame_divider;
    uint8_t frame_count;

    union
    {
      unsigned int map_base;
      uint8_t map_bytes[3];
    };
    union
    {
      unsigned int sprite_base;
      uint8_t sprite_bytes[3];
    };

    uint8_t scroll_x;
    uint8_t scroll_y;

    // Counters
    uint8_t divider;
  };

  void reset(Machine::State &cpu);
  void clock(Machine::State &cpu);
  uint8_t read(Machine::State &cpu, uint32_t address);
  void write(Machine::State &cpu, uint8_t data, uint32_t address);
}
