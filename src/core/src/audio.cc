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

extern "C" void audio_push();

void Audio::reset(Audio::State &audio)
{
  audio.enable = 0;
  audio.volume = 0;
  audio.write_index = 0;
}

void Audio::setSampleRate(Audio::State &audio, int sampleRate)
{
  audio.sampleRate = sampleRate;
}

void Audio::clock(Machine::State &state, int osc3)
{
  Audio::State &audio = state.audio;

  audio.sampleError += osc3 * audio.sampleRate;
  while (audio.sampleError > OSC3_SPEED)
  {
    Timers::Timer &timer = state.timers.timer[2];
    float volume;

    if (!audio.enable)
    {
      switch (audio.volume)
      {
      case 0b000:
      case 0b100:
        volume = 0.0;
        break;
      default:
        volume = 0.5;
        break;
      case 0b011:
      case 0b111:
        volume = 1.0;
        break;
      }

      if (timer.count < timer.compare)
      {
        volume = -volume;
      }
    }
    else
    {
      volume = 0.0;
    }

    state.buffers.audio[audio.write_index++] = audio.write_index; // volume;

    if (audio.write_index >= AUDIO_BUFFER_LENGTH)
    {
      // audio_push();
      audio.write_index = 0;
    }

    audio.sampleError -= OSC3_SPEED;
  }
}

uint8_t Audio::read(Audio::State &audio, uint32_t address)
{
  switch (address)
  {
  case 0x2070:
    return audio.enable;
  case 0x2071:
    return audio.volume;
  }
  return 0;
}

void Audio::write(Audio::State &audio, uint8_t data, uint32_t address)
{
  switch (address)
  {
  case 0x2070:
    audio.enable = data & 0b111;
    break;
  case 0x2071:
    audio.volume = data & 0b111;
    break;
  }
}
