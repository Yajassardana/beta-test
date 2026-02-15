// AudioWorklet processor for streaming PCM playback.
// Receives Int16 PCM chunks from the main thread, converts to Float32,
// and plays them through a ring buffer.

class PCMPlayerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // Ring buffer: ~180s at 24kHz mono
    this._bufferSize = 24000 * 180;
    this._buffer = new Float32Array(this._bufferSize);
    this._writeIndex = 0;
    this._readIndex = 0;
    this._samplesAvailable = 0;
    this._hasReceivedData = false;
    this._notifiedDone = false;

    // Pre-buffer ~150ms (3600 samples at 24kHz) before starting playback
    this._preBufferThreshold = 3600;
    this._preBuffering = true;

    // Debounce "done": require ~100ms of empty buffer (about 19 process() calls
    // at 128-sample frames) before signaling done
    this._emptyFrameCount = 0;
    this._emptyFramesNeeded = 19;

    this.port.onmessage = (event) => {
      const { command, data } = event.data;

      if (command === "buffer") {
        this._appendPCM(data);
      } else if (command === "clear") {
        this._writeIndex = 0;
        this._readIndex = 0;
        this._samplesAvailable = 0;
        this._hasReceivedData = false;
        this._notifiedDone = false;
        this._preBuffering = true;
        this._emptyFrameCount = 0;
      }
    };
  }

  _appendPCM(arrayBuffer) {
    const int16 = new Int16Array(arrayBuffer);
    const numSamples = int16.length;

    for (let i = 0; i < numSamples; i++) {
      this._buffer[this._writeIndex] = int16[i] / 32768;
      this._writeIndex = (this._writeIndex + 1) % this._bufferSize;
    }

    this._samplesAvailable += numSamples;
    if (this._samplesAvailable > this._bufferSize) {
      this._samplesAvailable = this._bufferSize;
    }

    this._hasReceivedData = true;
    this._notifiedDone = false;
    this._emptyFrameCount = 0;

    // Once we've accumulated enough, exit pre-buffering
    if (this._preBuffering && this._samplesAvailable >= this._preBufferThreshold) {
      this._preBuffering = false;
    }
  }

  process(_inputs, outputs) {
    const output = outputs[0];
    if (!output || !output[0]) return true;

    const channel = output[0];

    // While pre-buffering, output silence until threshold is reached
    if (this._preBuffering) {
      for (let i = 0; i < channel.length; i++) {
        channel[i] = 0;
      }
      return true;
    }

    const framesToRead = Math.min(channel.length, this._samplesAvailable);

    for (let i = 0; i < framesToRead; i++) {
      channel[i] = this._buffer[this._readIndex];
      this._readIndex = (this._readIndex + 1) % this._bufferSize;
    }

    // Fill remainder with silence
    for (let i = framesToRead; i < channel.length; i++) {
      channel[i] = 0;
    }

    this._samplesAvailable -= framesToRead;

    // Debounced "done" detection: buffer must stay empty for ~100ms
    if (this._hasReceivedData && this._samplesAvailable === 0 && !this._notifiedDone) {
      this._emptyFrameCount++;
      if (this._emptyFrameCount >= this._emptyFramesNeeded) {
        this._notifiedDone = true;
        this._preBuffering = true;
        this.port.postMessage({ type: "done" });
      }
    } else if (this._samplesAvailable > 0) {
      this._emptyFrameCount = 0;
    }

    return true;
  }
}

registerProcessor("pcm-player-processor", PCMPlayerProcessor);
