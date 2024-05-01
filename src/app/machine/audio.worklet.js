class StreamAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.queue = null;
    this.working = null;
    this.queueSample = 0;

    this.port.onmessage = (event) => {
      this.queue = event.data;
    };
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0][0];

    for (let i = 0; i < output.length; i++) {
      // Dequeue sample
      if (this.working == null || this.working.length <= this.queueSample) {
        this.working = this.queue;
        this.queue = null;
        this.queueSample = 0;

        if (this.queue == null) {
          break;
        }
      }

      output[i] = this.working[this.queueSample++];
    }

    return true;
  }
}

registerProcessor('stream-audio-processor', StreamAudioProcessor);
