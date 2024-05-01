class StreamAudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();

        this.queue = null;
        this.working = null;
        this.sample = 0;
        this.volume = 1.0;

        this.port.onmessage = (event) => {
          if (typeof event === 'number') {
            this.volume = event;
          } else {
            this.queue = event.data;
          }
        }
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0];

        output.forEach((channel) => {
            let i = 0;

            // Dequeue sample buffers
            while (i < channel.length) {
                if (this.working == null) {
                    if (this.queue) {
                        this.working = this.queue;
                        this.sample = 0;
                        this.queue = null;
                    } else {
                        break ;
                    }
                }

                channel[i++] = this.working[this.sample++] * this.volume;

                if (this.sample >= this.working.length) {
                    this.working = null;
                }
            }

            // Underflow
            while (i < channel.length) {
                channel[i++] = 0;
            }
        });

        return true;
    }
}

registerProcessor("stream-audio-processor", StreamAudioProcessor);
