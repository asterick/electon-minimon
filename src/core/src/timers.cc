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

using namespace Timers;

struct TimerIRQ {
	IRQ::Vector lo_underflow;
	IRQ::Vector hi_underflow;
	IRQ::Vector lo_compare;
};

static const TimerIRQ irqs[] = {
	{ IRQ::IRQ_TIM0, IRQ::IRQ_TIM1,     IRQ::IRQ_NONE },
	{ IRQ::IRQ_TIM2, IRQ::IRQ_TIM3,     IRQ::IRQ_NONE },
	{ IRQ::IRQ_NONE, IRQ::IRQ_TIM5, IRQ::IRQ_TIM5_CMP }
};

static const int PRESCALE_OSC1[] = {
	0, 1, 2, 3, 4, 5, 6, 7
};

static const int PRESCALE_OSC3[] = {
	1, 3, 5, 6, 7, 8, 10, 12
};

void Timers::reset(Machine::State& cpu) {
	memset(&cpu.timers, 0, sizeof(cpu.timers));
}

static inline int ticks(Timers::State& timers, bool clock_source, bool clock_ctrl, int clock_ratio, int osc1, int osc3) {
	if (!clock_ctrl) return 0;

	if (clock_source) {
		int adjust = PRESCALE_OSC1[clock_ratio];
		int mask = (1 << adjust) - 1;

		return ((timers.osc1_prescale & mask) + osc1) >> adjust;
	} else {
		int adjust = PRESCALE_OSC3[clock_ratio];
		int mask = (1 << adjust) - 1;

		return ((timers.osc3_prescale & mask) + osc3) >> adjust;
	}
}

static inline void compare(Machine::State& cpu, IRQ::Vector vec, int ticks, int compare, int preset, int count) {
	if (vec < 0) return ;

	if (compare > preset) return ;

	int compare_ticks = count - compare;

	if (compare_ticks < 0) compare_ticks += preset + 1;
		
	if (compare_ticks < ticks) {
		IRQ::trigger(cpu, vec);
	}
}

static inline void process_timer(Machine::State& cpu, int osc1, int osc3, Timer& timer, const TimerIRQ& vects) {
	if (timer.mode16) {
		if (!timer.lo_running) return ;

		int adv = ticks(cpu.timers, timer.lo_clock_source, timer.lo_clock_ctrl, timer.lo_clock_ratio, osc1, osc3);
		int count = timer.count - adv;
		
		if (count < 0) {
			IRQ::trigger(cpu, vects.hi_underflow);
			do {
				count += timer.preset + 1;	
			} while (count < 0);
		}

		compare(cpu, vects.lo_compare, adv, timer.compare, timer.preset, timer.count);

		timer.count = count;
	} else {
		if (timer.lo_running) {
			int adv = ticks(cpu.timers, timer.lo_clock_source, timer.lo_clock_ctrl, timer.lo_clock_ratio, osc1, osc3);
			int count = timer.lo_count - adv;

			if (count < 0) {
				IRQ::trigger(cpu, vects.lo_underflow);
				do {
					count += timer.lo_preset + 1;
				} while (count < 0);
			}

			compare(cpu, vects.lo_compare, adv, timer.lo_compare, timer.lo_preset, timer.lo_count);

			timer.lo_count = count;
		}

		if (timer.hi_running) {
			int count = timer.hi_count - ticks(cpu.timers, timer.hi_clock_source, timer.hi_clock_ctrl, timer.hi_clock_ratio, osc1, osc3);

			if (count < 0) {
				IRQ::trigger(cpu, vects.hi_underflow);
				do {
					count += timer.hi_preset + 1;
				} while (count < 0);
			}
			timer.hi_count = count;
		}
	}
}

void Timers::clock(Machine::State& cpu, int osc1, int osc3) {
	if (!cpu.timers.osc1_enable) osc1 = 0;
	if (!cpu.timers.osc3_enable) osc3 = 0;

	process_timer(cpu, osc1, osc3, cpu.timers.timer[0], irqs[0]);
	process_timer(cpu, osc1, osc3, cpu.timers.timer[1], irqs[1]);
	process_timer(cpu, osc1, osc3, cpu.timers.timer[2], irqs[2]);

	cpu.timers.osc1_prescale += osc1;
	cpu.timers.osc3_prescale += osc3;
}

static inline uint8_t getTimerFlagsLo(Timers::Timer& tim) {
	return 0
		| (tim.lo_input   ? 0b00000001 : 0)
		| (tim.lo_running ? 0b00000100 : 0)
		| (tim.lo_output  ? 0b00001000 : 0)
		| (tim.mode16     ? 0b10000000 : 0);
}

static inline uint8_t getTimerFlagsHi(Timers::Timer& tim) {
	return 0
		| (tim.hi_input   ? 0b00000001 : 0)
		| (tim.hi_running ? 0b00000100 : 0)
		| (tim.hi_output  ? 0b00001000 : 0);
}

static inline void setTimerFlagsLo(Timers::Timer& tim, uint8_t data) {
	tim.lo_input   = (data & 0b00000001) != 0;
	tim.lo_running = (data & 0b00000100) != 0;
	tim.lo_output  = (data & 0b00001000) != 0;
	tim.mode16     = (data & 0b10000000) != 0;

	// Preset
	if (data & 0b10000010) {
		if (tim.mode16) {
			tim.count = tim.preset;
		} else {
			tim.lo_count = tim.lo_preset;
		}
	}
}

static inline void setTimerFlagsHi(Timers::Timer& tim, uint8_t data) {
	tim.lo_input   = (data & 0b00000001) != 0;
	tim.lo_running = (data & 0b00000100) != 0;
	tim.lo_output  = (data & 0b00001000) != 0;

	// Preset
	if (data & 0b10000010 && !tim.mode16) {
		tim.hi_count = tim.hi_preset;
	}
}

uint8_t Timers::read(Machine::State& cpu, uint32_t address) {
	switch (address) {
	case 0x2018:
		return 0
			| (cpu.timers.timer[0].lo_clock_ratio)
			| (cpu.timers.timer[0].lo_clock_ctrl ? 0b00001000 : 0)
			| (cpu.timers.timer[0].hi_clock_ratio << 4)
			| (cpu.timers.timer[0].hi_clock_ctrl ? 0b10000000 : 0);

	case 0x201A:
		return 0
			| (cpu.timers.timer[1].lo_clock_ratio)
			| (cpu.timers.timer[1].lo_clock_ctrl ? 0b00001000 : 0)
			| (cpu.timers.timer[1].hi_clock_ratio << 4)
			| (cpu.timers.timer[1].hi_clock_ctrl ? 0b10000000 : 0);

	case 0x201C:
		return 0
			| (cpu.timers.timer[2].lo_clock_ratio)
			| (cpu.timers.timer[2].lo_clock_ctrl ? 0b00001000 : 0)
			| (cpu.timers.timer[2].hi_clock_ratio << 4)
			| (cpu.timers.timer[2].hi_clock_ctrl ? 0b10000000 : 0);

	case 0x2019:
		return 0	
			| (cpu.timers.osc3_enable ? 0b00100000 : 0)
			| (cpu.timers.osc1_enable ? 0b00010000 : 0)
			| (cpu.timers.timer[0].lo_clock_source ? 0b01 : 0)
			| (cpu.timers.timer[0].hi_clock_source ? 0b10 : 0);
	case 0x201B:
		return 0
			| (cpu.timers.timer[1].lo_clock_source ? 0b01 : 0)
			| (cpu.timers.timer[1].hi_clock_source ? 0b10 : 0);
	case 0x201D:
		return 0
			| (cpu.timers.timer[2].lo_clock_source ? 0b01 : 0)
			| (cpu.timers.timer[2].hi_clock_source ? 0b10 : 0);

	case 0x2030:
		return getTimerFlagsLo(cpu.timers.timer[0]);
	case 0x2031:
		return getTimerFlagsHi(cpu.timers.timer[0]);
	case 0x2038:
		return getTimerFlagsLo(cpu.timers.timer[1]);
	case 0x2039:
		return getTimerFlagsHi(cpu.timers.timer[1]);
	case 0x2040:
		return getTimerFlagsLo(cpu.timers.timer[2]);
	case 0x2041:
		return getTimerFlagsHi(cpu.timers.timer[2]);
	case 0x2032:
		return cpu.timers.timer[0].lo_preset;
	case 0x2033:
		return cpu.timers.timer[0].hi_preset;
	case 0x2034:
		return cpu.timers.timer[0].lo_compare;
	case 0x2035:
		return cpu.timers.timer[0].hi_compare;
	case 0x2036:
		return cpu.timers.timer[0].lo_count;
	case 0x2037:
		return cpu.timers.timer[0].hi_count;
	case 0x203A:
		return cpu.timers.timer[1].lo_preset;
	case 0x203B:
		return cpu.timers.timer[1].hi_preset;
	case 0x203C:
		return cpu.timers.timer[1].lo_compare;
	case 0x203D:
		return cpu.timers.timer[1].hi_compare;
	case 0x203E:
		return cpu.timers.timer[1].lo_count;
	case 0x203F:
		return cpu.timers.timer[1].hi_count;
	case 0x2042:
		return cpu.timers.timer[2].lo_preset;
	case 0x2043:
		return cpu.timers.timer[2].hi_preset;
	case 0x2044:
		return cpu.timers.timer[2].lo_compare;
	case 0x2045:
		return cpu.timers.timer[2].hi_compare;
	case 0x2046:
		return cpu.timers.timer[2].lo_count;
	case 0x2047:
		return cpu.timers.timer[2].hi_count;
	
	default:
		return 0xCD;
	}
}

void Timers::write(Machine::State& cpu, uint8_t data, uint32_t address) {
	switch (address) {
	case 0x2018:
		cpu.timers.timer[0].lo_clock_ratio = data & 0b0111;
		cpu.timers.timer[0].lo_clock_ctrl = (data & 0b1000) ? true : false;
		cpu.timers.timer[0].hi_clock_ratio = (data >> 4) & 0b0111;
		cpu.timers.timer[0].hi_clock_ctrl = (data & 0b10000000) ? true : false;
		break ;
	case 0x201A:
		cpu.timers.timer[1].lo_clock_ratio = data & 0b0111;
		cpu.timers.timer[1].lo_clock_ctrl = (data & 0b1000) ? true : false;
		cpu.timers.timer[1].hi_clock_ratio = (data >> 4) & 0b0111;
		cpu.timers.timer[1].hi_clock_ctrl = (data & 0b10000000) ? true : false;
		break ;
	case 0x201C:
		cpu.timers.timer[2].lo_clock_ratio = data & 0b0111;
		cpu.timers.timer[2].lo_clock_ctrl = (data & 0b1000) ? true : false;
		cpu.timers.timer[2].hi_clock_ratio = (data >> 4) & 0b0111;
		cpu.timers.timer[2].hi_clock_ctrl = (data & 0b10000000) ? true : false;
		break ;

	case 0x2019:
		cpu.timers.osc3_enable = (data & 0b00100000) ? true : false;
		cpu.timers.osc1_enable = (data & 0b00010000) ? true : false;

		cpu.timers.timer[0].lo_clock_source = (data & 0b01) ? true : false;
		cpu.timers.timer[0].hi_clock_source = (data & 0b10) ? true : false;
		break ;
	case 0x201B:
		cpu.timers.timer[1].lo_clock_source = (data & 0b01) ? true : false;
		cpu.timers.timer[1].hi_clock_source = (data & 0b10) ? true : false;
		break ;
	case 0x201D:
		cpu.timers.timer[2].lo_clock_source = (data & 0b01) ? true : false;
		cpu.timers.timer[2].hi_clock_source = (data & 0b10) ? true : false;
		break ;

	// Timer Data
	case 0x2030:
		setTimerFlagsLo(cpu.timers.timer[0], data);
		break ;
	case 0x2031:
		setTimerFlagsHi(cpu.timers.timer[0], data);
		break ;
	case 0x2038:
		setTimerFlagsLo(cpu.timers.timer[1], data);
		break ;
	case 0x2039:
		setTimerFlagsHi(cpu.timers.timer[1], data);
		break ;
	case 0x2040:
		setTimerFlagsLo(cpu.timers.timer[2], data);
		break ;
	case 0x2041:
		setTimerFlagsHi(cpu.timers.timer[2], data);
		break ;

	case 0x2032:
		cpu.timers.timer[0].lo_preset = data;
		break ;
	case 0x2033:
		cpu.timers.timer[0].hi_preset = data;
		break ;
	case 0x2034:
		cpu.timers.timer[0].lo_compare = data;
		break ;
	case 0x2035:
		cpu.timers.timer[0].hi_compare = data;
		break ;

	case 0x203A:
		cpu.timers.timer[1].lo_preset = data;
		break ;
	case 0x203B:
		cpu.timers.timer[1].hi_preset = data;
		break ;
	case 0x203C:
		cpu.timers.timer[1].lo_compare = data;
		break ;
	case 0x203D:
		cpu.timers.timer[1].hi_compare = data;
		break ;

	case 0x2042:
		cpu.timers.timer[2].lo_preset = data;
		break ;
	case 0x2043:
		cpu.timers.timer[2].hi_preset = data;
		break ;
	case 0x2044:
		cpu.timers.timer[2].lo_compare = data;
		break ;
	case 0x2045:
		cpu.timers.timer[2].hi_compare = data;
		break ;
	}
}
