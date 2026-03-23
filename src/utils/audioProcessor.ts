// Audio preprocessing utilities to improve speech recognition accuracy

export class AudioProcessor {
  private audioContext: AudioContext;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private gainNode: GainNode;
  private compressor: DynamicsCompressorNode;
  private filter: BiquadFilterNode;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Create audio processing nodes
    this.gainNode = this.audioContext.createGain();
    this.compressor = this.audioContext.createDynamicsCompressor();
    this.filter = this.audioContext.createBiquadFilter();

    // Configure compressor to normalize audio levels
    this.compressor.threshold.value = -50;
    this.compressor.knee.value = 40;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0;
    this.compressor.release.value = 0.25;

    // Configure high-pass filter to remove low-frequency noise
    this.filter.type = 'highpass';
    this.filter.frequency.value = 80; // Remove frequencies below 80Hz (rumble, hum)
    this.filter.Q.value = 1;

    // Set initial gain (boost)
    this.gainNode.gain.value = 1.5;
  }

  // Process audio stream for better recognition
  processStream(stream: MediaStream): MediaStream {
    try {
      this.source = this.audioContext.createMediaStreamSource(stream);

      // Create audio processing chain:
      // Input → High-pass filter → Gain boost → Compressor → Output
      this.source
        .connect(this.filter)
        .connect(this.gainNode)
        .connect(this.compressor);

      // Create output stream
      const destination = this.audioContext.createMediaStreamDestination();
      this.compressor.connect(destination);

      return destination.stream;
    } catch (error) {
      console.error('Error processing audio stream:', error);
      return stream; // Return original stream on error
    }
  }

  // Cleanup
  disconnect() {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
  }

  // Adjust gain for different microphone sensitivities
  setGain(value: number) {
    this.gainNode.gain.value = Math.max(0.5, Math.min(3, value));
  }

  // Get current audio context state
  getState() {
    return this.audioContext.state;
  }

  // Resume audio context if suspended (Safari requirement)
  async resume() {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }
}

// Noise gate to filter out background noise
export class NoiseGate {
  private threshold: number;
  private audioContext: AudioContext;

  constructor(threshold: number = -50) {
    this.threshold = threshold; // in dB
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  // Apply noise gate to stream
  applyToStream(stream: MediaStream): MediaStream {
    const source = this.audioContext.createMediaStreamSource(stream);
    const analyser = this.audioContext.createAnalyser();
    const gainNode = this.audioContext.createGain();
    const destination = this.audioContext.createMediaStreamDestination();

    analyser.fftSize = 2048;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    source.connect(analyser);
    analyser.connect(gainNode);
    gainNode.connect(destination);

    // Monitor audio levels and gate based on threshold
    const checkLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const dB = 20 * Math.log10(average / 255);

      // Open or close gate based on threshold
      if (dB < this.threshold) {
        gainNode.gain.value = 0; // Gate closed (silence)
      } else {
        gainNode.gain.value = 1; // Gate open (pass audio)
      }

      requestAnimationFrame(checkLevel);
    };

    checkLevel();

    return destination.stream;
  }
}

// Auto gain control to maintain consistent volume
export class AutoGainControl {
  private targetLevel: number = 0.7;
  private audioContext: AudioContext;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  applyToStream(stream: MediaStream): MediaStream {
    const source = this.audioContext.createMediaStreamSource(stream);
    const analyser = this.audioContext.createAnalyser();
    const gainNode = this.audioContext.createGain();
    const destination = this.audioContext.createMediaStreamDestination();

    analyser.fftSize = 2048;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    source.connect(analyser);
    analyser.connect(gainNode);
    gainNode.connect(destination);

    let currentGain = 1.0;

    const adjustGain = () => {
      analyser.getByteTimeDomainData(dataArray);

      // Calculate RMS (Root Mean Square) for current audio level
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / dataArray.length);

      // Adjust gain to reach target level
      if (rms > 0.01) { // Only adjust if there's audio
        const ratio = this.targetLevel / rms;
        // Smooth gain adjustment (prevent sudden changes)
        currentGain = currentGain * 0.95 + ratio * 0.05;
        // Limit gain range
        currentGain = Math.max(0.5, Math.min(3, currentGain));
        gainNode.gain.value = currentGain;
      }

      requestAnimationFrame(adjustGain);
    };

    adjustGain();

    return destination.stream;
  }
}
