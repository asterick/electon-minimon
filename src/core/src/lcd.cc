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
#include <string.h>

#include "machine.h"
#include "debug.h"

void LCD::reset(LCD::State &lcd)
{
  memset(&lcd, 0, sizeof(lcd));
}

static inline void fill(uint8_t *target, uint8_t color)
{
  for (int i = LCD_WIDTH; i > 0; i--)
  {
    *(target++) = (*target >> 1) | color;
  }
}

static void render(Machine::Buffers &buffers, LCD::State &lcd, uint8_t com)
{
  uint8_t *line = buffers.lcd_shift[lcd.reverse_com_scan ? (63 - com) : com];

  if (!lcd.display_enable)
  {
    fill(line, 0x00);
    return;
  }
  else if (lcd.all_on)
  {
    fill(line, 0x80);
    return;
  }

  int drawline = (com + lcd.start_address) % 0x40;
  uint8_t mask = 1 << (drawline % 8);
  uint8_t *current_page = lcd.gddram[drawline / 8];

  for (int x = 0; x < LCD_WIDTH; x++)
  {
    uint8_t byte = current_page[lcd.adc_select ? 131 - x : x];

    *(line++) = (*line >> 1) | (((byte & mask) != 0) ? 0x80 : 0x00);
  }
}

void LCD::clock(Machine::State &cpu, int osc3)
{
  cpu.lcd.overflow += osc3 * LCD_SPEED;

  while (cpu.lcd.overflow >= OSC3_SPEED)
  {
    if (++cpu.lcd.scanline > 0x40)
    {
      cpu.lcd.scanline = 0;
    }

    if (cpu.lcd.scanline < 0x40)
    {
      render(cpu.buffers, cpu.lcd, cpu.lcd.scanline);
    }
    else
    {
      uint32_t *framebuffer = &cpu.buffers.framebuffer[0][0];
      const uint8_t *lcd_shift = &cpu.buffers.lcd_shift[0][0];

      static uint8_t volume = 0;
      const float lo = (volume <= 0x20) ? 0.0f : (volume - 0x20) / 31.0f;
      const float hi = (volume >= 0x20) ? 1.0f : volume / 31.0f;

      const float range = hi - lo;

      for (int i = LCD_WIDTH * LCD_HEIGHT; i; i--)
      {
        float weight = cpu.buffers.weights[*(lcd_shift++)] * range + lo;
        int color = (int)(256.0f * weight);
        *(framebuffer++) = cpu.buffers.palette[color > 0xFF ? 0xFF : color];
      }

      Blitter::clock(cpu);
      volume = cpu.lcd.volume;
    }

    cpu.lcd.overflow -= OSC3_SPEED;
  }
}

uint8_t LCD::get_scanline(LCD::State &lcd)
{
  return lcd.scanline + 1;
}

uint8_t LCD::read(LCD::State &lcd, uint32_t address)
{
  if (address == 0x20FE)
  {
    dprintf("READ DISPLAY STATUS");
    return 0;
  }
  else
  {
    uint8_t data = lcd.read_buffer;

    data = lcd.gddram[lcd.page_address][lcd.column_address];

    if (lcd.column_address < 0x83 && !lcd.rmw_mode)
    {
      lcd.column_address++;
    }

    return data;
  }
}

void LCD::write(LCD::State &lcd, uint8_t data, uint32_t address)
{
  lcd.read_buffer = data;

  if (lcd.setting_volume)
  {
    lcd.volume = data & 0x3F;
    lcd.setting_volume = false;
    return;
  }

  if (address == 0x20FE)
  {
    switch (data)
    {
    case 0b10101110:
    case 0b10101111:
      lcd.display_enable = data & 1;
      break;

    case 0b01000000 ... 0b01111111:
      lcd.start_address = data & 0b111111;
      break;

    case 0b00000000 ... 0b00001111:
      lcd.column_address = (lcd.column_address & 0xF0) | (data & 0xF);

      if (lcd.column_address > 0x83)
        lcd.column_address = 0x83;
      break;

    case 0b00010000 ... 0b00011111:
      lcd.column_address = (lcd.column_address & 0x0F) | (data << 4);

      if (lcd.column_address > 0x83)
        lcd.column_address = 0x83;
      break;

    case 0b00100000 ... 0b00100111:
      lcd.resistor_ratio = data & 0b111;
      break;

    case 0b00101000 ... 0b00101111:
      lcd.operating_mode = data & 0b111;
      break;

    case 0b10110000 ... 0b10111111:
      lcd.page_address = data & 0xF;

      if (lcd.page_address > 8)
        lcd.page_address = 8;
      break;

    case 0b10100000 ... 0b10100001:
      lcd.adc_select = data & 1;
      break;

    case 0b10100110 ... 0b10100111:
      lcd.reverse_display = data & 1;
      break;

    case 0b10100100 ... 0b10100101:
      lcd.all_on = data & 1;
      break;

    case 0b10100010 ... 0b10100011:
      lcd.lcd_bias = data & 1;
      break;

    case 0b10101100 ... 0b10101101:
      lcd.static_indicator = data & 1;
      break;

    case 0b11100000: // Set RMW mode
      lcd.rmw_mode = true;
      break;

    case 0b11101110: // End
      lcd.rmw_mode = false;
      break;

    case 0b11000000 ... 0b11001111:
      lcd.reverse_com_scan = data & 8;
      break;

    case 0b10000001: // Set electric volume
      lcd.setting_volume = true;
      break;

    case 0b11100011: // NOP
      break;

    default:
      dprintf("LCD COMMAND %b", data);
    }
  }
  else
  {
    if (lcd.page_address >= 8)
      data &= 1;

    lcd.gddram[lcd.page_address][lcd.column_address] = data;

    if (lcd.column_address < 0x83)
    {
      lcd.column_address++;
    }
  }
}
