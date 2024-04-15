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

// TODO: HANDLE DEBOUNCE REGISTERS

static const IRQ::Vector vectors[] = {
	IRQ::IRQ_K00,
	IRQ::IRQ_K01,
	IRQ::IRQ_K02,
	IRQ::IRQ_K03,
	IRQ::IRQ_K04,
	IRQ::IRQ_K05,
	IRQ::IRQ_K06,
	IRQ::IRQ_K07,
	IRQ::IRQ_K10,
	IRQ::IRQ_K11
};

void Input::reset(Input::State& inputs) {
	memset(&inputs, 0, sizeof(inputs));
	inputs.input_state = 0b1111111111;
}

void Input::update(Machine::State& cpu, uint16_t value) {
	uint16_t trigger = (value ^ cpu.input.input_state) & (value ^ cpu.input.interrupt_direction);

	cpu.input.input_state = value;

	for (int i = 0; i < 10; i++) {
		if (trigger & (1 << i)) IRQ::trigger(cpu, vectors[i]);
	}
}

uint8_t Input::read(Input::State& inputs, uint32_t address) {
	switch (address) {
	case 0x2050:
		return inputs.interrupt_direction & 0xFF;
	case 0x2051:
		return inputs.interrupt_direction >> 8;
	case 0x2052:
		return inputs.input_state & 0xFF;
	case 0x2053:
		return inputs.input_state >> 8;
	case 0x2054:
		return (inputs.dejitter_k04_k07 << 4) | inputs.dejitter_k00_k03;
	case 0x2055:
		return inputs.dejitter_k10_k11;
	default: 
		return 0xCD;
	}
}

void Input::write(Input::State& inputs, uint8_t data, uint32_t address) {
	switch (address) {
	case 0x2050:
		inputs.interrupt_direction = (inputs.interrupt_direction & 0xFF00) | data;
		break ;	
	case 0x2051:
		inputs.interrupt_direction = (inputs.interrupt_direction & 0x00FF) | ((data & 0b00000011) << 8);
		break ;	
	case 0x2054:
		inputs.dejitter_k00_k03 = data & 0b0111;
		inputs.dejitter_k04_k07 = (data >> 4) & 0b0111;
		break ;	
	case 0x2055:
		inputs.dejitter_k10_k11 = data & 0b0111;
		break ;	
	}
}
