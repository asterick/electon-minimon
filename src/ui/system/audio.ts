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

const BUFFER_LENGTH = 1024; // This is the size of an audio clip push

const audioContext = new AudioContext();
const workletPromise = audioContext.audioWorklet.addModule(new URL('./audio.worklet.js', import.meta.url))

export default class Audio {
    private node:AudioWorkletNode;
    private buffer:Float32Array;
    private writeIndex:number;
    private sample:number;

    constructor() {
        this.buffer = new Float32Array(BUFFER_LENGTH * 4);
        this.writeIndex = 0;
        this.sample = 0.0;

        workletPromise.then(() => {
            this.node = new AudioWorkletNode(
                audioContext,
                "stream-audio-processor",
            );
    
            this.node.connect(audioContext.destination);
        })
    }

    get sampleRate() {
        return audioContext.sampleRate;
    }

    push(f) {
        for (let i = 0; i < f.length; i++) {
            this.buffer[this.writeIndex++] = f[i];
            
            if (this.writeIndex >= this.buffer.length) {
                // Send samples to the worklet
                this.writeIndex = 0;
            }            
        }
    }
}
