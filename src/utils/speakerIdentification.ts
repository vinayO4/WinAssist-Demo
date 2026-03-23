// Speaker identification using voice characteristics

export interface VoiceProfile {
  id: string;
  name: string;
  averagePitch: number;
  pitchRange: number;
  averageVolume: number;
  voiceSignature: number[]; // Frequency distribution
}

export class SpeakerIdentifier {
  private audioContext: AudioContext;
  private profiles: Map<string, VoiceProfile> = new Map();
  private currentSpeaker: string | null = null;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  // Train the system by recording each speaker's voice
  async trainSpeaker(stream: MediaStream, speakerId: string, speakerName: string): Promise<VoiceProfile> {
    const source = this.audioContext.createMediaStreamSource(stream);
    const analyser = this.audioContext.createAnalyser();

    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);

    const profile = await this.analyzeVoice(analyser, speakerId, speakerName);
    this.profiles.set(speakerId, profile);

    source.disconnect();
    return profile;
  }

  // Analyze voice characteristics
  private async analyzeVoice(
    analyser: AnalyserNode,
    speakerId: string,
    speakerName: string
  ): Promise<VoiceProfile> {
    return new Promise((resolve) => {
      const bufferLength = analyser.frequencyBinCount;
      const frequencyData = new Uint8Array(bufferLength);
      const timeDomainData = new Uint8Array(bufferLength);

      let pitchSamples: number[] = [];
      let volumeSamples: number[] = [];
      let frequencySignature: number[] = new Array(10).fill(0);
      let sampleCount = 0;
      const samplingDuration = 3000; // 3 seconds of sampling

      const sample = () => {
        analyser.getByteFrequencyData(frequencyData);
        analyser.getByteTimeDomainData(timeDomainData);

        // Calculate pitch (fundamental frequency)
        const pitch = this.detectPitch(timeDomainData, this.audioContext.sampleRate);
        if (pitch > 0) {
          pitchSamples.push(pitch);
        }

        // Calculate volume (RMS)
        let sum = 0;
        for (let i = 0; i < timeDomainData.length; i++) {
          const normalized = (timeDomainData[i] - 128) / 128;
          sum += normalized * normalized;
        }
        const volume = Math.sqrt(sum / timeDomainData.length);
        volumeSamples.push(volume);

        // Build frequency signature (divide spectrum into 10 bands)
        const bandSize = Math.floor(frequencyData.length / 10);
        for (let band = 0; band < 10; band++) {
          let bandSum = 0;
          for (let i = 0; i < bandSize; i++) {
            bandSum += frequencyData[band * bandSize + i];
          }
          frequencySignature[band] += bandSum / bandSize;
        }

        sampleCount++;

        if (sampleCount * 100 < samplingDuration) {
          setTimeout(sample, 100);
        } else {
          // Calculate averages
          const avgPitch = pitchSamples.reduce((a, b) => a + b, 0) / pitchSamples.length;
          const pitchRange = Math.max(...pitchSamples) - Math.min(...pitchSamples);
          const avgVolume = volumeSamples.reduce((a, b) => a + b, 0) / volumeSamples.length;

          // Normalize frequency signature
          frequencySignature = frequencySignature.map(v => v / sampleCount);

          resolve({
            id: speakerId,
            name: speakerName,
            averagePitch: avgPitch,
            pitchRange,
            averageVolume: avgVolume,
            voiceSignature: frequencySignature,
          });
        }
      };

      sample();
    });
  }

  // Detect pitch using autocorrelation
  private detectPitch(buffer: Uint8Array, sampleRate: number): number {
    const SIZE = buffer.length;
    const MAX_SAMPLES = Math.floor(SIZE / 2);
    let bestOffset = -1;
    let bestCorrelation = 0;
    let rms = 0;

    // Calculate RMS
    for (let i = 0; i < SIZE; i++) {
      const val = (buffer[i] - 128) / 128;
      rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);

    // Not enough signal
    if (rms < 0.01) return -1;

    // Autocorrelation
    let lastCorrelation = 1;
    for (let offset = 1; offset < MAX_SAMPLES; offset++) {
      let correlation = 0;

      for (let i = 0; i < MAX_SAMPLES; i++) {
        correlation += Math.abs((buffer[i] - 128) / 128 - (buffer[i + offset] - 128) / 128);
      }

      correlation = 1 - correlation / MAX_SAMPLES;

      if (correlation > 0.9 && correlation > lastCorrelation) {
        const foundGoodCorrelation = correlation > bestCorrelation;
        if (foundGoodCorrelation) {
          bestCorrelation = correlation;
          bestOffset = offset;
        }
      }

      lastCorrelation = correlation;
    }

    if (bestCorrelation > 0.01 && bestOffset !== -1) {
      return sampleRate / bestOffset;
    }

    return -1;
  }

  // Identify speaker from current audio
  identifySpeaker(stream: MediaStream): string | null {
    if (this.profiles.size === 0) {
      return null;
    }

    const source = this.audioContext.createMediaStreamSource(stream);
    const analyser = this.audioContext.createAnalyser();

    analyser.fftSize = 2048;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const frequencyData = new Uint8Array(bufferLength);
    const timeDomainData = new Uint8Array(bufferLength);

    analyser.getByteFrequencyData(frequencyData);
    analyser.getByteTimeDomainData(timeDomainData);

    // Calculate current voice characteristics
    const currentPitch = this.detectPitch(timeDomainData, this.audioContext.sampleRate);

    let currentVolume = 0;
    for (let i = 0; i < timeDomainData.length; i++) {
      const normalized = (timeDomainData[i] - 128) / 128;
      currentVolume += normalized * normalized;
    }
    currentVolume = Math.sqrt(currentVolume / timeDomainData.length);

    // Build current frequency signature
    const currentSignature: number[] = [];
    const bandSize = Math.floor(frequencyData.length / 10);
    for (let band = 0; band < 10; band++) {
      let bandSum = 0;
      for (let i = 0; i < bandSize; i++) {
        bandSum += frequencyData[band * bandSize + i];
      }
      currentSignature.push(bandSum / bandSize);
    }

    // Compare with stored profiles
    let bestMatch: string | null = null;
    let bestScore = Infinity;

    this.profiles.forEach((profile, id) => {
      // Calculate similarity score (lower is better)
      const pitchDiff = Math.abs(currentPitch - profile.averagePitch) / profile.averagePitch;
      const volumeDiff = Math.abs(currentVolume - profile.averageVolume);

      // Cosine similarity for frequency signatures
      let dotProduct = 0;
      let magnitudeA = 0;
      let magnitudeB = 0;

      for (let i = 0; i < 10; i++) {
        dotProduct += currentSignature[i] * profile.voiceSignature[i];
        magnitudeA += currentSignature[i] * currentSignature[i];
        magnitudeB += profile.voiceSignature[i] * profile.voiceSignature[i];
      }

      const cosineSimilarity = dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
      const signatureDiff = 1 - cosineSimilarity;

      // Combined score
      const score = pitchDiff * 0.4 + volumeDiff * 0.2 + signatureDiff * 0.4;

      if (score < bestScore && score < 0.3) { // Threshold for match
        bestScore = score;
        bestMatch = id;
      }
    });

    this.currentSpeaker = bestMatch;
    source.disconnect();

    return bestMatch;
  }

  // Get stored profiles
  getProfiles(): VoiceProfile[] {
    return Array.from(this.profiles.values());
  }

  // Clear all profiles
  clearProfiles(): void {
    this.profiles.clear();
  }

  // Get current speaker
  getCurrentSpeaker(): string | null {
    return this.currentSpeaker;
  }
}

// Simple speaker detection based on pitch alone (faster, less accurate)
export function detectSpeakerByPitch(
  audioContext: AudioContext,
  analyser: AnalyserNode,
  spPitchRange: [number, number],
  clientPitchRange: [number, number]
): 'sp' | 'client' | 'unknown' {
  const bufferLength = analyser.fftSize;
  const timeDomainData = new Uint8Array(bufferLength);
  analyser.getByteTimeDomainData(timeDomainData);

  // Detect fundamental frequency (pitch)
  let pitch = 0;
  let bestCorrelation = 0;

  for (let offset = 1; offset < bufferLength / 2; offset++) {
    let correlation = 0;
    for (let i = 0; i < bufferLength / 2; i++) {
      correlation += Math.abs((timeDomainData[i] - 128) - (timeDomainData[i + offset] - 128));
    }
    correlation = 1 - correlation / (bufferLength / 2);

    if (correlation > bestCorrelation && correlation > 0.9) {
      bestCorrelation = correlation;
      pitch = audioContext.sampleRate / offset;
    }
  }

  // Compare with known ranges
  if (pitch >= spPitchRange[0] && pitch <= spPitchRange[1]) {
    return 'sp';
  } else if (pitch >= clientPitchRange[0] && pitch <= clientPitchRange[1]) {
    return 'client';
  }

  return 'unknown';
}
