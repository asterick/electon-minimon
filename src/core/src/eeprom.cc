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

#include "eeprom.h"
#include "debug.h"

void EEPROM::reset(EEPROM::State& state) {
	state.data_in = PIN_FLOAT;
	state.data_out = PIN_FLOAT;
	state.clock_in = PIN_FLOAT;
	state.mode = SYSTEM_STOP;
}

void EEPROM::setClockPin(EEPROM::State& state, PinState clock) {
	bool clock_then = getClockPin(state);
	state.clock_in = clock;
	bool clock_now = getClockPin(state);

	if (clock_then == clock_now) {
		return ;
	}

	bool data = getDataPin(state);

	if (clock_now) {
		if (state.bit == -1 && state.mode == SYSTEM_READ) {
			if (data) {
				state.mode = SYSTEM_STOP;
			}
		} else {
			state.shift = (state.shift << 1) | data;
		}
	} else {
		switch (++state.bit) {
		case 0 ... 7:
			if (state.mode == SYSTEM_READ) {
				state.data_out = (state.data[state.address] & (0x80 >> state.bit)) ? PIN_FLOAT : PIN_RESET;
			} else {
				state.data_out = PIN_FLOAT;
			}
			break ;
		case 8:	// Data inbound
			switch (state.mode) {
			case SYSTEM_STOP:
				state.data_out = PIN_FLOAT;
				break ;
			case SYSTEM_SELECT:
				if (state.shift == 0xA0) {
					state.mode = SYSTEM_ADDRESS_H;
					state.data_out = PIN_RESET;
				} else if (state.shift == 0xA1) {
					state.mode = SYSTEM_READ;
					state.data_out = PIN_RESET;
				} else {
					state.mode = SYSTEM_STOP;
					state.data_out = PIN_FLOAT;
				}
				break ;
			case SYSTEM_ADDRESS_H:
				state.address = (state.shift << 8) & 0x1FFF;
				state.data_out = PIN_RESET;
				state.mode = SYSTEM_ADDRESS_L;
				break ;
			case SYSTEM_ADDRESS_L:
				state.address |= state.shift;
				state.data_out = PIN_RESET;
				state.mode = SYSTEM_WRITE;
				break ;
			case SYSTEM_WRITE:
				state.data[state.address] = state.shift;
				state.address = (state.address + 1) & 0x1FFF;
				state.data_out = PIN_RESET;
				break ;
			case SYSTEM_READ:
				state.address = (state.address + 1) & 0x1FFF;
				state.data_out = PIN_FLOAT;
				break ;
			}

			state.bit = -1;
			break ;
		}
	}
}

void EEPROM::setDataPin(EEPROM::State& state, PinState data) {
	bool clock = getClockPin(state);
	bool data_then = getDataPin(state);
	state.data_in = data;
	bool data_now = getDataPin(state);

	if (!clock || data_then == data_now) {
		return ;
	}

	if (data_now) {
		state.mode = SYSTEM_STOP;
		state.data_out = PIN_FLOAT;
	} else {
		state.mode = SYSTEM_SELECT;
		state.bit = -1;
	}
}

bool EEPROM::getClockPin(EEPROM::State& state) {
	return (state.clock_in != PIN_RESET);
}

bool EEPROM::getDataPin(EEPROM::State& state) {
	return (state.data_in != PIN_RESET) && (state.data_out != PIN_RESET);
}
