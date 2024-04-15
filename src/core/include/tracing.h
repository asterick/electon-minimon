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

#define BIT(n) (1u<<n)

enum TraceType : uint32_t {
    TRACE_NONE          = 0,
    TRACE_VECTOR        = BIT(1),
    TRACE_BRANCH_TARGET = BIT(2),
    TRACE_OFFSET        = BIT(3),

    TRACE_TILE_DATA     = BIT(9),
    TRACE_SPRITE_DATA   = BIT(10),

    TRACE_DATA          = BIT(16),
    TRACE_STACK         = BIT(17),
    TRACE_IMMEDIATE     = BIT(18),
    TRACE_INSTRUCTION   = BIT(19),
    TRACE_EX_INST       = BIT(20),

    TRACE_WORD_LO       = BIT(28),
    TRACE_WORD_HI       = BIT(29),
    TRACE_READ          = BIT(30),
    TRACE_WRITE         = BIT(31)
};

extern "C" void trace_access(Machine::State& cpu, uint32_t address, uint32_t kind, uint8_t data = 0);