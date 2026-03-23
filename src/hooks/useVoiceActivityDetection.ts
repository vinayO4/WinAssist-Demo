import { useEffect, useRef, useState } from 'react';

interface UseVoiceActivityDetectionProps {
  stream: MediaStream | null;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  silenceThreshold?: number;
  silenceDuration?: number;
}

export function useVoiceActivityDetection({
  stream,
  onSpeechStart,
  onSpeechEnd,
  silenceThreshold = 128.5, // Audio level threshold (0-255)
  silenceDuration = 1500, // ms of silence before triggering speech end
}: UseVoiceActivityDetectionProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream) {
      return;
    }

    // Create audio context and analyser
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    microphone.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    // Start monitoring audio levels
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function detectVoice() {
      if (!analyserRef.current) return;

      analyserRef.current.getByteTimeDomainData(dataArray);

      // Calculate average audio level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i];
        sum += Math.abs(value - 128); // Center around 128
      }
      const average = sum / bufferLength;

      // Check if speaking (audio level above threshold)
      const isSpeakingNow = average > (silenceThreshold - 128);

      if (isSpeakingNow) {
        // Clear silence timer if speaking
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        // Trigger speech start if wasn't speaking before
        if (!isSpeaking) {
          setIsSpeaking(true);
          onSpeechStart?.();
        }
      } else {
        // Detected silence - start timer if speaking
        if (isSpeaking && !silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            setIsSpeaking(false);
            onSpeechEnd?.();
            silenceTimerRef.current = null;
          }, silenceDuration);
        }
      }

      // Continue monitoring
      animationFrameRef.current = requestAnimationFrame(detectVoice);
    }

    detectVoice();

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stream, isSpeaking, onSpeechStart, onSpeechEnd, silenceThreshold, silenceDuration]);

  return { isSpeaking };
}
