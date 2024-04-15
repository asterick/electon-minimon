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

namespace Timers {
	union Timer {
		struct {
			bool lo_input;
			bool lo_running;
			bool lo_output;
			bool mode16;

			bool hi_input;
			bool hi_running;
			bool hi_output;

			union {
				uint16_t preset;
				struct {
					uint8_t lo_preset;
					uint8_t hi_preset;
				};
			};
			union {
				uint16_t compare;
				struct {
					uint8_t lo_compare;
					uint8_t hi_compare;
				};
			};
			union {
				uint16_t count;
				struct {
					uint8_t lo_count;
					uint8_t hi_count;
				};
			};
		
			int  lo_clock_ratio;
			bool lo_clock_ctrl;
			bool lo_clock_source;

			int  hi_clock_ratio;
			bool hi_clock_ctrl;
			bool hi_clock_source;
		};
	};

	struct State {
		Timer timer[3];

		bool osc1_enable;
		bool osc3_enable;

		uint32_t osc1_prescale;
		uint32_t osc3_prescale;
	};

	void reset(Machine::State& cpu);
	void clock(Machine::State& cpu, int osc1, int osc3);
	uint8_t read(Machine::State& cpu, uint32_t address);
	void write(Machine::State& cpu, uint8_t data, uint32_t address);
};
