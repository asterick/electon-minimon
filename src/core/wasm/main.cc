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
#include <stddef.h>

#include "machine.h"
#include "debug.h"

enum FieldType : uint32_t
{
  TYPE_END = 0,
  TYPE_STRUCT,
  TYPE_UINT8,
  TYPE_UINT16,
  TYPE_UINT32,
  TYPE_INT8,
  TYPE_INT16,
  TYPE_INT32,
  TYPE_FLOAT32,
  TYPE_BOOL
};

struct FieldDecl;
struct StructDecl
{
  uint32_t size;
  const FieldDecl *fields;
};

struct FieldDecl
{
  FieldType type;
  const char *name;
  uint32_t offset;
  const StructDecl *def;
  const int *sizes;
};

#define FIELD(n, s, f, t, ...)              \
  {                                         \
    t, n, offsetof(s, f), NULL, __VA_ARGS__ \
  }
#define STRUCT(n, s, f, def, ...)                     \
  {                                                   \
    TYPE_STRUCT, n, offsetof(s, f), &def, __VA_ARGS__ \
  }
#define SIZE(...) ((const int[]){__VA_ARGS__, -1})

extern "C" Machine::State *const get_machine()
{
  static Machine::State machine_state = {
      .buffers = {
          .bios = {
#include "bios.h"
          }}};
  return &machine_state;
}

static const StructDecl CpuState = {
    sizeof(CPU::State),
    (const FieldDecl[]){
        FIELD("z", CPU::State, flag.z, TYPE_BOOL),
        FIELD("c", CPU::State, flag.c, TYPE_BOOL),
        FIELD("v", CPU::State, flag.v, TYPE_BOOL),
        FIELD("n", CPU::State, flag.n, TYPE_BOOL),
        FIELD("d", CPU::State, flag.d, TYPE_BOOL),
        FIELD("u", CPU::State, flag.u, TYPE_BOOL),
        FIELD("i", CPU::State, flag.i, TYPE_UINT8),

        FIELD("f0", CPU::State, flag.f0, TYPE_BOOL),
        FIELD("f1", CPU::State, flag.f1, TYPE_BOOL),
        FIELD("f2", CPU::State, flag.f2, TYPE_BOOL),
        FIELD("f3", CPU::State, flag.f3, TYPE_BOOL),

        FIELD("br", CPU::State, br, TYPE_UINT8),
        FIELD("ep", CPU::State, ep, TYPE_UINT8),
        FIELD("xp", CPU::State, xp, TYPE_UINT8),
        FIELD("yp", CPU::State, yp, TYPE_UINT8),
        FIELD("cb", CPU::State, cb, TYPE_UINT8),
        FIELD("nb", CPU::State, nb, TYPE_UINT8),
        FIELD("a", CPU::State, a, TYPE_UINT8),
        FIELD("b", CPU::State, b, TYPE_UINT8),
        FIELD("l", CPU::State, l, TYPE_UINT8),
        FIELD("h", CPU::State, h, TYPE_UINT8),
        FIELD("ba", CPU::State, ba, TYPE_UINT16),
        FIELD("hl", CPU::State, hl, TYPE_UINT16),
        FIELD("pc", CPU::State, pc, TYPE_UINT16),
        FIELD("sp", CPU::State, sp, TYPE_UINT16),
        FIELD("ix", CPU::State, ix, TYPE_UINT16),
        FIELD("iy", CPU::State, iy, TYPE_UINT16),
        {TYPE_END}}};

static const StructDecl IrqState = {
    sizeof(IRQ::State),
    (const FieldDecl[]){
        FIELD("enable", IRQ::State, enable, TYPE_BOOL),
        FIELD("active", IRQ::State, active, TYPE_BOOL),
        FIELD("priorty", IRQ::State, priority, TYPE_UINT8, SIZE(IRQ::TOTAL_HARDWARE_IRQS)),
        FIELD("next_priority", IRQ::State, next_priority, TYPE_INT32),
        FIELD("next_irq", IRQ::State, next_irq, TYPE_INT8),
        {TYPE_END}}};

static const StructDecl Tim256State = {
    sizeof(TIM256::State),
    (const FieldDecl[]){
        FIELD("running", TIM256::State, running, TYPE_BOOL),
        FIELD("value", TIM256::State, value, TYPE_UINT16),
        {TYPE_END}}};

static const StructDecl RtcState = {
    sizeof(RTC::State),
    (const FieldDecl[]){
        FIELD("running", RTC::State, running, TYPE_BOOL),
        FIELD("value", RTC::State, value, TYPE_UINT32),
        FIELD("prescale", RTC::State, prescale, TYPE_UINT16),
        {TYPE_END}}};

static const StructDecl ControlState = {
    sizeof(Control::State),
    (const FieldDecl[]){
        FIELD("data", Control::State, data, TYPE_UINT8, SIZE(3)),
        {TYPE_END}}};

static const StructDecl EepromState = {
    sizeof(EEPROM::State),
    (const FieldDecl[]){
        FIELD("data", EEPROM::State, data, TYPE_UINT8, SIZE(0x2000)),
        FIELD("data_in", EEPROM::State, data_in, TYPE_UINT8),
        FIELD("data_out", EEPROM::State, data_out, TYPE_UINT8),
        FIELD("clock_in", EEPROM::State, clock_in, TYPE_UINT8),
        FIELD("address", EEPROM::State, address, TYPE_UINT16),
        FIELD("mode", EEPROM::State, mode, TYPE_UINT8),
        FIELD("shift", EEPROM::State, shift, TYPE_UINT8),
        FIELD("bit", EEPROM::State, bit, TYPE_INT8),
        {TYPE_END}}};

static const StructDecl GpioState = {
    sizeof(GPIO::State),
    (const FieldDecl[]){
        FIELD("output", GPIO::State, output, TYPE_UINT8),
        FIELD("direction", GPIO::State, direction, TYPE_UINT8),
        STRUCT("eeprom", GPIO::State, eeprom, EepromState),
        {TYPE_END}}};

static const StructDecl LcdState = {
    sizeof(LCD::State),
    (const FieldDecl[]){
        FIELD("gddram", LCD::State, gddram, TYPE_UINT8, SIZE(9, 132)),
        FIELD("read_buffer", LCD::State, read_buffer, TYPE_UINT8),
        FIELD("volume", LCD::State, volume, TYPE_UINT8),
        FIELD("column_address", LCD::State, column_address, TYPE_UINT8),
        FIELD("page_address", LCD::State, page_address, TYPE_UINT8),
        FIELD("start_address", LCD::State, start_address, TYPE_UINT8),

        FIELD("rmw_mode", LCD::State, rmw_mode, TYPE_BOOL),
        FIELD("adc_select", LCD::State, adc_select, TYPE_BOOL),
        FIELD("setting_volume", LCD::State, setting_volume, TYPE_BOOL),
        FIELD("display_enable", LCD::State, display_enable, TYPE_BOOL),
        FIELD("reverse_display", LCD::State, reverse_display, TYPE_BOOL),
        FIELD("all_on", LCD::State, all_on, TYPE_BOOL),
        FIELD("reverse_com_scan", LCD::State, reverse_com_scan, TYPE_BOOL),
        FIELD("static_indicator", LCD::State, static_indicator, TYPE_BOOL),
        FIELD("lcd_bias", LCD::State, lcd_bias, TYPE_BOOL),

        FIELD("resistor_ratio", LCD::State, resistor_ratio, TYPE_UINT8),
        FIELD("operating_mode", LCD::State, operating_mode, TYPE_UINT8),
        FIELD("scanline", LCD::State, scanline, TYPE_UINT8),

        FIELD("overflow", LCD::State, overflow, TYPE_INT32),

        {TYPE_END}}};

static const StructDecl InputState = {
    sizeof(Input::State),
    (const FieldDecl[]){
        FIELD("interrupt_direction", Input::State, interrupt_direction, TYPE_UINT16),
        FIELD("input_state", Input::State, input_state, TYPE_UINT16),
        FIELD("dejitter_k00_k03", Input::State, dejitter_k00_k03, TYPE_UINT8),
        FIELD("dejitter_k04_k07", Input::State, dejitter_k04_k07, TYPE_UINT8),
        FIELD("dejitter_k10_k11", Input::State, dejitter_k10_k11, TYPE_UINT8),
        {TYPE_END}}};

static const StructDecl BlitterState = {
    sizeof(Blitter::State),
    (const FieldDecl[]){
        FIELD("invert_map", Blitter::State, invert_map, TYPE_BOOL),
        FIELD("enable_map", Blitter::State, enable_map, TYPE_BOOL),
        FIELD("enable_sprites", Blitter::State, enable_sprites, TYPE_BOOL),
        FIELD("enable_copy", Blitter::State, enable_copy, TYPE_BOOL),
        FIELD("map_size", Blitter::State, map_size, TYPE_UINT8),
        FIELD("frame_count", Blitter::State, frame_count, TYPE_UINT8),
        FIELD("frame_divider", Blitter::State, frame_divider, TYPE_UINT8),
        FIELD("map_base", Blitter::State, map_base, TYPE_UINT32),
        FIELD("sprite_base", Blitter::State, sprite_base, TYPE_UINT32),
        FIELD("scroll_x", Blitter::State, scroll_x, TYPE_UINT8),
        FIELD("scroll_y", Blitter::State, scroll_y, TYPE_UINT8),
        FIELD("divider", Blitter::State, divider, TYPE_UINT8),
        {TYPE_END}}};

static const StructDecl BlitterOverlay = {
    sizeof(Blitter::Overlay),
    (const FieldDecl[]){
        FIELD("framebuffer", Blitter::Overlay, framebuffer, TYPE_UINT8, SIZE(8, 96)),
        FIELD("oam", Blitter::Overlay, oam, TYPE_UINT8, SIZE(24, 4)),
        FIELD("map", Blitter::Overlay, map, TYPE_UINT8, SIZE(384)),
        {TYPE_END}}};

static const StructDecl TimerInstance = {
    sizeof(Timers::Timer),
    (const FieldDecl[]){
        FIELD("lo_input", Timers::Timer, lo_input, TYPE_BOOL),
        FIELD("lo_running", Timers::Timer, lo_running, TYPE_BOOL),
        FIELD("lo_output", Timers::Timer, lo_output, TYPE_BOOL),
        FIELD("hi_input", Timers::Timer, hi_input, TYPE_BOOL),
        FIELD("hi_running", Timers::Timer, hi_running, TYPE_BOOL),
        FIELD("hi_output", Timers::Timer, hi_output, TYPE_BOOL),
        FIELD("mode16", Timers::Timer, mode16, TYPE_BOOL),
        FIELD("preset", Timers::Timer, preset, TYPE_UINT16),
        FIELD("compare", Timers::Timer, compare, TYPE_UINT16),
        FIELD("count", Timers::Timer, count, TYPE_UINT16),
        FIELD("lo_clock_ratio", Timers::Timer, lo_clock_ratio, TYPE_INT32),
        FIELD("lo_clock_ctrl", Timers::Timer, lo_clock_ctrl, TYPE_BOOL),
        FIELD("lo_clock_source", Timers::Timer, lo_clock_source, TYPE_BOOL),
        FIELD("hi_clock_ratio", Timers::Timer, hi_clock_ratio, TYPE_INT32),
        FIELD("hi_clock_ctrl", Timers::Timer, hi_clock_ctrl, TYPE_BOOL),
        FIELD("hi_clock_source", Timers::Timer, hi_clock_source, TYPE_BOOL),
        {TYPE_END}}};

static const StructDecl TimersState = {
    sizeof(Timers::State),
    (const FieldDecl[]){
        STRUCT("timer", Timers::State, timer[3], TimerInstance, SIZE(3)),
        FIELD("osc1_enable", Timers::State, osc1_enable, TYPE_BOOL),
        FIELD("osc3_enable", Timers::State, osc3_enable, TYPE_BOOL),
        FIELD("osc1_prescale", Timers::State, osc1_prescale, TYPE_UINT32),
        FIELD("osc3_prescale", Timers::State, osc3_prescale, TYPE_UINT32),
        {TYPE_END}}};

static const StructDecl MachineBuffers = {
    sizeof(Machine::Buffers),
    (const FieldDecl[]){
        FIELD("cartridge", Machine::Buffers, cartridge, TYPE_UINT8, SIZE(0x200000)),
        FIELD("bios", Machine::Buffers, bios, TYPE_UINT8, SIZE(0x1000)),
        FIELD("audio", Machine::Buffers, audio, TYPE_FLOAT32, SIZE(AUDIO_BUFFER_LENGTH)),
        FIELD("framebuffer", Machine::Buffers, framebuffer, TYPE_UINT8, SIZE(LCD_WIDTH *LCD_HEIGHT * sizeof(uint32_t))),
        FIELD("palette", Machine::Buffers, palette, TYPE_UINT32, SIZE(0x100)),
        FIELD("weights", Machine::Buffers, weights, TYPE_FLOAT32, SIZE(0x100)),
        {TYPE_END}}};

static const StructDecl MachineState = {
    sizeof(Machine::State),
    (const FieldDecl[]){
        STRUCT("buffers", Machine::State, buffers, MachineBuffers),
        STRUCT("cpu", Machine::State, reg, CpuState),
        STRUCT("ctrl", Machine::State, ctrl, ControlState),
        STRUCT("gpio", Machine::State, gpio, GpioState),
        STRUCT("rtc", Machine::State, rtc, RtcState),
        STRUCT("irq", Machine::State, irq, IrqState),
        STRUCT("tim256", Machine::State, tim256, Tim256State),
        FIELD("ram", Machine::State, ram, TYPE_UINT8, SIZE(0x1000)),
        STRUCT("lcd", Machine::State, lcd, LcdState),
        STRUCT("input", Machine::State, input, InputState),
        STRUCT("blitter", Machine::State, blitter, BlitterState),
        STRUCT("overlay", Machine::State, overlay, BlitterOverlay),
        STRUCT("timers", Machine::State, timers, TimersState),
        FIELD("bus_cap", Machine::State, bus_cap, TYPE_UINT8),
        FIELD("clocks", Machine::State, clocks, TYPE_INT32),
        FIELD("osc1_overflow", Machine::State, osc1_overflow, TYPE_INT32),
        FIELD("status", Machine::State, status, TYPE_UINT8),
        {TYPE_END}}};

extern "C" const StructDecl *get_description()
{
  return &MachineState;
}
