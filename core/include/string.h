#pragma once

#include <stdint.h>
#include <stddef.h>

extern "C" void* memset(void* dest, uint32_t value, size_t length);
extern "C" void* memcpy(void* dest, const void* src, size_t length);
