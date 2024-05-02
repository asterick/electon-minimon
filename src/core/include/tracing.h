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

#define BIT(n) (1u << n)

enum TraceType : uint32_t
{
  TRACE_NONE = 0,

  // Category: Access Type
  TRACE_WORD_LO = BIT(0),
  TRACE_WORD_HI = BIT(1),
  TRACE_DATA = BIT(2),
  TRACE_INSTRUCTION = BIT(3),
  TRACE_EX_INST = BIT(4),
  TRACE_IMMEDIATE = BIT(5),
  TRACE_STACK = BIT(6),

  // Category: Argument type
  TRACE_VECTOR = BIT(10),
  TRACE_BRANCH_TARGET = BIT(11),
  TRACE_OFFSET = BIT(12),

  // Category: Data type
  TRACE_TILE_DATA = BIT(20),
  TRACE_SPRITE_DATA = BIT(21),
  TRACE_RETURN_ADDRESS = BIT(22),

  // Category: Access direction
  TRACE_READ = BIT(30),
  TRACE_WRITE = BIT(31)
};

extern "C" void trace_access(Machine::State &cpu, uint32_t address, uint32_t kind);
