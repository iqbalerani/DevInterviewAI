import { useRef, useCallback } from 'react';

/**
 * Voice Activity Detection Configuration
 */
const VAD_CONFIG = {
  silenceThreshold: 0.05,      // Audio level below this = silence (reduced sensitivity)
  endOfUtteranceMs: 5000,      // 5 seconds of silence to detect end of user response
  hardFallbackMs: 60000        // 60 second hard timeout per question
};

/**
 * Client-side Voice Activity Detection Hook
 * Detects when user starts and stops speaking
 */
export const useVoiceActivityDetection = (
  onSpeechStart: () => void,
  onSpeechEnd: () => void
) => {
  const isSpeakingRef = useRef(false);
  const silenceTimerRef = useRef<number | null>(null);
  const hardTimerRef = useRef<number | null>(null);

  /**
   * Process audio level from AudioWorklet
   * Called on every audio chunk
   */
  const processAudioLevel = useCallback((audioLevel: number) => {
    const isSpeaking = audioLevel > VAD_CONFIG.silenceThreshold;

    if (isSpeaking && !isSpeakingRef.current) {
      // 🎤 Speech STARTED
      isSpeakingRef.current = true;
      onSpeechStart();

      // Start hard fallback timer (force end after 2 seconds)
      hardTimerRef.current = window.setTimeout(() => {
        if (isSpeakingRef.current) {
          console.warn('⏰ VAD: Hard timeout reached, forcing speech end');
          isSpeakingRef.current = false;
          onSpeechEnd();
        }
      }, VAD_CONFIG.hardFallbackMs);

    } else if (!isSpeaking && isSpeakingRef.current) {
      // 🔇 Possible end of speech - wait for silence duration
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      silenceTimerRef.current = window.setTimeout(() => {
        if (isSpeakingRef.current) {
          // ✅ Speech ENDED (900ms of silence detected)
          isSpeakingRef.current = false;
          onSpeechEnd();

          // Clear hard timer
          if (hardTimerRef.current) {
            clearTimeout(hardTimerRef.current);
            hardTimerRef.current = null;
          }
        }
      }, VAD_CONFIG.endOfUtteranceMs);

    } else if (isSpeaking && isSpeakingRef.current) {
      // 🗣️ Still speaking - reset silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }
  }, [onSpeechStart, onSpeechEnd]);

  /**
   * Cleanup timers on unmount
   */
  const cleanup = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (hardTimerRef.current) {
      clearTimeout(hardTimerRef.current);
      hardTimerRef.current = null;
    }
    isSpeakingRef.current = false;
  }, []);

  return { processAudioLevel, cleanup };
};
