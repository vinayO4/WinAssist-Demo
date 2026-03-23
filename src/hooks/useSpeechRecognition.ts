import { useState, useEffect, useCallback, useRef } from 'react';
import type { ISpeechRecognition, SpeechRecognitionEvent, SpeakerMode } from '../types/index';
import { useVoiceActivityDetection } from './useVoiceActivityDetection';
import { correctTranscript } from '../services/transcriptCorrection';
import { AudioProcessor } from '../utils/audioProcessor';
import { SpeakerIdentifier } from '../utils/speakerIdentification';

export interface UseSpeechRecognitionReturn {
  transcript: string;
  rawTranscript: string;
  interimTranscript: string; // Real-time text as you speak
  isListening: boolean;
  isSpeaking: boolean;
  isSupported: boolean;
  isProcessing: boolean;
  confidence: 'high' | 'medium' | 'low';
  error: string | null;
  currentSpeaker: 'sp' | 'client';
  speakerMode: SpeakerMode;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  setSpeaker: (speaker: 'sp' | 'client') => void;
  setSpeakerMode: (mode: SpeakerMode) => void;
  trainSpeaker: (speakerId: 'sp' | 'client', duration?: number) => Promise<void>;
  setKeepListening: (keep: boolean) => void; // Control continuous listening
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState(''); // Corrected transcript
  const [rawTranscript, setRawTranscript] = useState(''); // Raw from speech API
  const [interimTranscript, setInterimTranscript] = useState(''); // Real-time interim text
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confidence, setConfidence] = useState<'high' | 'medium' | 'low'>('medium');
  const [error, setError] = useState<string | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [currentSpeaker, setCurrentSpeaker] = useState<'sp' | 'client'>('sp'); // Default to SP
  const [speakerMode, setSpeakerMode] = useState<SpeakerMode>('manual'); // manual, automatic, or off

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const lastProcessedIndex = useRef(0);
  const finalTranscriptRef = useRef(''); // Track final transcript separately
  const correctionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioProcessorRef = useRef<AudioProcessor | null>(null);
  const speakerIdentifierRef = useRef<SpeakerIdentifier | null>(null);
  const shouldBeListeningRef = useRef(false); // Track if we should auto-restart
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const restartCountRef = useRef(0); // Track number of restarts for debugging

  // Use VAD to detect when user is actively speaking
  const { isSpeaking } = useVoiceActivityDetection({
    stream: mediaStream,
    silenceThreshold: 130, // Slightly above baseline
    silenceDuration: 1000, // 1 second of silence
  });

  // Check if browser supports speech recognition
  const isSupported = !!(
    window.SpeechRecognition || window.webkitSpeechRecognition
  );

  // Initialize speech recognition
  useEffect(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true; // Enable real-time interim results
    recognition.lang = 'en-US';
    (recognition as any).maxAlternatives = 3; // Get multiple alternatives for better accuracy

    console.log('[init] Speech recognition initialized with continuous =', recognition.continuous);

    (recognition as any).onstart = () => {
      console.log('[onstart] Speech recognition started (restart #' + restartCountRef.current + ')');
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      // Process all results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          // Only add this final result if we haven't processed it yet
          if (i >= lastProcessedIndex.current) {
            // Use best alternative based on confidence
            let bestTranscript = transcript;
            let bestConfidence = result[0].confidence || 0.8;

            // Check other alternatives for better confidence
            for (let j = 1; j < result.length && j < 3; j++) {
              const alt = result[j];
              if (alt.confidence > bestConfidence) {
                bestTranscript = alt.transcript;
                bestConfidence = alt.confidence;
              }
            }

            final += bestTranscript + ' ';
            lastProcessedIndex.current = i + 1;
          }
        } else {
          // Interim results - show in real-time
          interim += transcript;
        }
      }

      // Update interim transcript for real-time display
      setInterimTranscript(interim);

      // Process final transcripts
      if (final) {
        finalTranscriptRef.current += final;

        // Update raw transcript immediately
        setRawTranscript(finalTranscriptRef.current);
        setTranscript(finalTranscriptRef.current);

        // Clear interim since we now have final text
        setInterimTranscript('');

        // SKIP transcript correction while actively listening
        // Only correct after user stops listening (to avoid interference)
        if (!shouldBeListeningRef.current) {
          console.log('[Correction] User stopped listening, will correct transcript');

          // Debounce correction to avoid too many API calls
          if (correctionTimerRef.current) {
            clearTimeout(correctionTimerRef.current);
          }

          correctionTimerRef.current = setTimeout(async () => {
            setIsProcessing(true);
            try {
              const result = await correctTranscript(finalTranscriptRef.current);
              setTranscript(result.correctedText);
              setConfidence(result.confidence);

              if (result.corrections.length > 0) {
                console.log('[Correction] Applied corrections:', result.corrections);
              }
            } catch (err) {
              console.error('[Correction] Error:', err);
            } finally {
              setIsProcessing(false);
            }
          }, 1000);
        } else {
          console.log('[Correction] Skipping correction - still listening for ZIP code');
        }
      }
    };

    recognition.onerror = (event: Event) => {
      console.error('Speech recognition error:', event);
      const errorEvent = event as any;

      // Don't treat 'no-speech' or 'aborted' as critical errors
      if (errorEvent.error === 'no-speech') {
        console.log('No speech detected, will continue listening...');
        return; // Don't set error state for no-speech
      }

      if (errorEvent.error === 'aborted') {
        console.log('Recognition aborted, will restart if needed...');
        return;
      }

      setError('Error occurred during speech recognition');
      shouldBeListeningRef.current = false;
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log('[onend] Speech recognition ended');
      console.log('[onend] shouldBeListening:', shouldBeListeningRef.current);
      console.log('[onend] Restart count:', restartCountRef.current);

      // Auto-restart if we should still be listening (user didn't explicitly stop)
      if (shouldBeListeningRef.current) {
        restartCountRef.current += 1;
        console.log('[onend] AUTO-RESTARTING (attempt #' + restartCountRef.current + ')...');
        // Keep isListening true so UI doesn't flicker

        // Immediate restart (no delay) for seamless experience
        try {
          if (recognitionRef.current && shouldBeListeningRef.current) {
            console.log('[onend] Calling recognition.start()...');
            recognitionRef.current.start();
            console.log('[onend] ✓ recognition.start() called successfully');
          }
        } catch (err) {
          console.error('[onend] ✗ Error calling recognition.start():', err);
          // If restart fails, try again with delay
          restartTimeoutRef.current = setTimeout(() => {
            try {
              if (recognitionRef.current && shouldBeListeningRef.current) {
                console.log('[onend-retry] Calling recognition.start() (retry)...');
                recognitionRef.current.start();
                console.log('[onend-retry] ✓ recognition.start() called successfully (retry)');
              }
            } catch (retryErr) {
              console.error('[onend-retry] ✗ Failed to restart after retry:', retryErr);
              shouldBeListeningRef.current = false;
              setIsListening(false);
              setError('Speech recognition stopped unexpectedly. Please restart.');
            }
          }, 100);
        }
      } else {
        console.log('[onend] NOT restarting - user stopped manually');
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldBeListeningRef.current = false;
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isSupported]);

  const startListening = useCallback(async () => {
    if (!recognitionRef.current || isListening) return;

    try {
      setError(null);
      lastProcessedIndex.current = 0; // Reset the index when starting
      shouldBeListeningRef.current = true; // Enable auto-restart
      restartCountRef.current = 0; // Reset restart counter

      console.log('[startListening] Starting speech recognition with continuous mode');

      // Request microphone access with audio constraints for better quality
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000, // Higher sample rate for better quality
          channelCount: 1, // Mono is better for speech
        },
      });

      // Apply audio preprocessing for even better quality
      audioProcessorRef.current = new AudioProcessor();
      await audioProcessorRef.current.resume(); // Required for Safari

      const processedStream = audioProcessorRef.current.processStream(stream);
      setMediaStream(processedStream);

      console.log('[startListening] Calling recognition.start()...');
      recognitionRef.current.start();
      console.log('[startListening] ✓ recognition.start() called');
      console.log('[startListening] shouldBeListeningRef.current =', shouldBeListeningRef.current);
      console.log('[startListening] recognition.continuous =', recognitionRef.current.continuous);
    } catch (err) {
      console.error('[startListening] Error:', err);
      shouldBeListeningRef.current = false;
      setError('Failed to start speech recognition. Please allow microphone access.');
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;

    try {
      shouldBeListeningRef.current = false; // Disable auto-restart
      console.log('Stopping listening, auto-restart disabled');

      // Clear any pending restart
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }

      recognitionRef.current.stop();
      setIsListening(false);
      lastProcessedIndex.current = 0; // Reset when stopping

      // Stop media stream tracks
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        setMediaStream(null);
      }

      // Cleanup audio processor
      if (audioProcessorRef.current) {
        audioProcessorRef.current.disconnect();
        audioProcessorRef.current = null;
      }
    } catch (err) {
      console.error('Error stopping speech recognition:', err);
    }
  }, [isListening, mediaStream]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setRawTranscript('');
    setInterimTranscript('');
    setConfidence('medium');
    lastProcessedIndex.current = 0;
    finalTranscriptRef.current = '';

    if (correctionTimerRef.current) {
      clearTimeout(correctionTimerRef.current);
      correctionTimerRef.current = null;
    }

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  }, []);

  // Manually set current speaker
  const setSpeaker = useCallback((speaker: 'sp' | 'client') => {
    setCurrentSpeaker(speaker);
  }, []);

  // Control whether to keep listening (external control)
  const setKeepListening = useCallback((keep: boolean) => {
    console.log('[setKeepListening] Setting keep listening to:', keep);
    shouldBeListeningRef.current = keep;

    // If setting to false and currently listening, stop
    if (!keep && isListening) {
      console.log('[setKeepListening] Stopping recognition because keep=false');
      stopListening();
    }
  }, [isListening, stopListening]);

  // Train speaker identification
  const trainSpeaker = useCallback(async (speakerId: 'sp' | 'client') => {
    if (!mediaStream) {
      setError('Please start listening first before training');
      return;
    }

    if (!speakerIdentifierRef.current) {
      speakerIdentifierRef.current = new SpeakerIdentifier();
    }

    try {
      const speakerName = speakerId === 'sp' ? 'Service Provider' : 'Client';
      await speakerIdentifierRef.current.trainSpeaker(mediaStream, speakerId, speakerName);
      console.log(`✓ Trained ${speakerName} voice profile`);
    } catch (err) {
      console.error('Error training speaker:', err);
      setError(`Failed to train ${speakerId} voice`);
    }
  }, [mediaStream]);

  return {
    transcript,
    rawTranscript,
    interimTranscript,
    isListening,
    isSpeaking,
    isSupported,
    isProcessing,
    confidence,
    error,
    currentSpeaker,
    speakerMode,
    startListening,
    stopListening,
    resetTranscript,
    setSpeaker,
    setSpeakerMode,
    trainSpeaker,
    setKeepListening,
  };
}
