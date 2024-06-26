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

namespace Machine { struct State; };

static const int AUDIO_BUFFER_LENGTH = 1024;

namespace Audio {
	struct State {
		uint8_t volume;
		uint8_t enable;

		int write_index;

		int sampleRate;
		int sampleAccumulator;
		int sampleCount;
		int sampleError;
	};

	void setSampleRate(State&, int sampleRate);
	float* getSampleBuffer(Audio::State& audio);

	void reset(State&);
	void clock(Machine::State&, int osc3);
	uint8_t read(State&, uint32_t address);
	void write(State&, uint8_t data, uint32_t address);
};
