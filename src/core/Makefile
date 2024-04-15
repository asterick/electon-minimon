all: wasm

clean:
	rm -Rf include/table.h instructions.ts
	make -C wasm clean

wasm: table.h instructions.ts
	make -C wasm

instructions.ts: ./tools/convert.py ./tools/s1c88.csv
	python3 ./tools/convert.py > ./instructions.ts

table.h: ./tools/table.py ./tools/s1c88.csv
	python3 ./tools/table.py > ./include/table.h

.PHONY: all clean wasm
