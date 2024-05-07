SRCDIR=../src
BUILDDIR=obj

SOURCES=$(filter-out $(SRCDIR)/retroarch.cc, $(wildcard $(SRCDIR)/*.cc))
OBJECTS=$(patsubst $(SRCDIR)/%.cc,$(BUILDDIR)/%.o,$(SOURCES)) $(BUILDDIR)/main.o
TARGET=../../../assets/libminimon.wasm

LD=$(if $(shell which wasm-ld),wasm-ld,wasm-ld-10)
DUMP=llvm-dwarfdump
CC=clang

EXPORTS = \
	--export get_machine \
	--export set_sample_rate \
	--export update_inputs \
	--export cpu_initialize \
  --export cpu_reset \
	--export cpu_advance \
	--export cpu_step \
	--export cpu_read \
	--export cpu_write \
	--export get_description

CPPFLAGS = --target=wasm32 -nostdlib -mbulk-memory -O2 -I../include -std=c++17 -g -Wall
LDFLAGS = --no-entry --allow-undefined --lto-O3 $(EXPORTS)

all: $(BUILDDIR) $(TARGET)

clean:
	rm -Rf $(TARGET) $(BUILDDIR)

retroarch: $(BUILDDIR)
	make -f Make.retroarch

$(TARGET): $(OBJECTS)
	$(LD) $(LDFLAGS) $(OBJECTS) -o $@

$(BUILDDIR)/%.o: $(SRCDIR)/%.cc ../include/*.h
	$(CC) $(CPPFLAGS) $< -c -o $@

$(BUILDDIR)/main.o: main.cc ../include/*.h
	$(CC) $(CPPFLAGS) $< -c -o $@

$(BUILDDIR):
	mkdir -p $(BUILDDIR)

.PHONY: all clean disassembly
