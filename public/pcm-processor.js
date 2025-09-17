// public/pcm-processor.js
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.port.onmessage = (event) => {
      // control messages if needed
    };
  }

  process(inputs) {
    const input = inputs[0];
    if (input.length > 0) {
      const channelData = input[0];
      // Enviamos a main thread
      this.port.postMessage(channelData);
    }
    return true;
  }
}

registerProcessor("pcm-processor", PCMProcessor);
