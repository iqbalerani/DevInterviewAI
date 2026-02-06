/**
 * AudioWorkletProcessor for capturing microphone input
 * Replaces deprecated ScriptProcessorNode
 */
class AudioInputProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];

    if (input && input.length > 0) {
      const channelData = input[0]; // Mono channel

      // Calculate audio level for VAD (Voice Activity Detection)
      let sum = 0;
      for (let i = 0; i < channelData.length; i++) {
        sum += Math.abs(channelData[i]);
      }
      const audioLevel = sum / channelData.length;

      // Convert Float32Array to Int16Array for PCM encoding
      const int16Data = new Int16Array(channelData.length);
      for (let i = 0; i < channelData.length; i++) {
        // Clamp values to [-1, 1] and convert to 16-bit PCM
        const clamped = Math.max(-1, Math.min(1, channelData[i]));
        int16Data[i] = clamped * 32768;
      }

      // Send PCM data and audio level to main thread
      this.port.postMessage({
        type: 'audio-data',
        data: int16Data.buffer,
        audioLevel: audioLevel // NEW: for client-side VAD
      }, [int16Data.buffer]); // Transfer ownership for performance
    }

    return true; // Keep processor alive
  }
}

registerProcessor('audio-input-processor', AudioInputProcessor);
