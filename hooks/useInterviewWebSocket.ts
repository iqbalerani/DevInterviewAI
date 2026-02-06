import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '../store';
import { useVoiceActivityDetection } from './useVoiceActivityDetection';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3002/ws/interview';

const SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

function encode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, sampleRate);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export const useInterviewWebSocket = (sessionId: string) => {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const isBackendReadyRef = useRef(false); // Gate for audio sending

  const { addTranscript, updatePartialTranscript, finalizeTranscript, setAISpeaking, updateSession } = useAppStore();

  // VAD callbacks ref (updated when WebSocket connects)
  const vadCallbacksRef = useRef({
    onSpeechStart: () => {},
    onSpeechEnd: () => {}
  });

  // Setup VAD at hook level (proper React hook usage)
  const { processAudioLevel } = useVoiceActivityDetection(
    () => vadCallbacksRef.current.onSpeechStart(),
    () => vadCallbacksRef.current.onSpeechEnd()
  );

  const disconnect = useCallback(() => {
    console.log('Disconnecting WebSocket...');

    // Reset ready flag
    isBackendReadyRef.current = false;

    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'disconnect' }));
      wsRef.current.close();
      wsRef.current = null;
    }

    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }

    sourcesRef.current.forEach(s => {
      try { s.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();

    setStatus('disconnected');
    setAISpeaking(false);
  }, [setAISpeaking]);

  const connect = useCallback(async () => {
    if (status !== 'disconnected') return;

    setStatus('connecting');

    try {
      // Initialize Audio Contexts
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: SAMPLE_RATE });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });

      // Load AudioWorklet module
      await audioContextRef.current.audioWorklet.addModule('/audio-processor.js');

      // Resume contexts
      await audioContextRef.current.resume();
      await outputAudioContextRef.current.resume();

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup audio worklet
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(audioContextRef.current, 'audio-input-processor');

      sourceNodeRef.current = source;
      workletNodeRef.current = workletNode;

      // IMMEDIATELY attach worklet handler (before connecting source to prevent race condition)
      workletNode.port.onmessage = (e) => {
        if (e.data.type === 'audio-data') {
          // Process VAD (always - needed for speech detection)
          if (e.data.audioLevel !== undefined) {
            processAudioLevel(e.data.audioLevel);
          }

          // GATE: Only send audio if backend is ready
          const ws = wsRef.current;
          if (!isBackendReadyRef.current) {
            // Silently drop audio until backend ready (prevents flood)
            return;
          }

          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'audio',
              data: encode(new Uint8Array(e.data.data))
            }));
          }
        }
      };

      source.connect(workletNode);
      workletNode.connect(audioContextRef.current.destination);

      // Create WebSocket connection
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        // Send connect message with sessionId
        ws.send(JSON.stringify({
          type: 'connect',
          sessionId
        }));
      };

      ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'connected':
            console.log('Interview session connected');
            setStatus('connected');

            // ENABLE audio sending now that backend is ready
            isBackendReadyRef.current = true;
            console.log('✅ Backend ready - audio sending enabled');

            // Update VAD callbacks now that WebSocket is ready
            vadCallbacksRef.current = {
              onSpeechStart: () => {
                console.log('🎤 User speech started');
                ws.send(JSON.stringify({ type: 'user_speech_started' }));
                // Barge-in disabled: AI continues speaking to completion
              },
              onSpeechEnd: () => {
                console.log('🔇 User speech ended');
                ws.send(JSON.stringify({ type: 'user_speech_ended' }));
              }
            };
            break;

          case 'audio':
            // Received audio from AI
            setAISpeaking(true);
            const ctx = outputAudioContextRef.current;

            if (ctx) {
              // Resume context if suspended (browser autoplay policy)
              if (ctx.state === 'suspended') {
                console.log('⏯️  Resuming suspended AudioContext...');
                await ctx.resume();
                console.log('✅ AudioContext resumed, new state:', ctx.state);
              }
            }

            if (ctx && ctx.state !== 'closed') {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              try {
                const buffer = await decodeAudioData(decode(message.data), ctx, OUTPUT_SAMPLE_RATE);

                const audioSource = ctx.createBufferSource();
                audioSource.buffer = buffer;
                audioSource.connect(ctx.destination);
                audioSource.onended = () => {
                  sourcesRef.current.delete(audioSource);
                  if (sourcesRef.current.size === 0) {
                    setAISpeaking(false);
                    // Notify backend that AI finished speaking to unblock user audio
                    if (ws && ws.readyState === WebSocket.OPEN) {
                      ws.send(JSON.stringify({ type: 'ai_speaking_ended' }));
                      console.log('📢 Sent ai_speaking_ended to backend');
                    }
                  }
                };
                audioSource.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                sourcesRef.current.add(audioSource);
              } catch (e) {
                console.error('❌ Audio playback error:', e);
                console.error('   AudioContext state:', ctx?.state);
                console.error('   Message data length:', message.data?.length);
                console.error('   Error details:', e instanceof Error ? e.message : String(e));
              }
            }
            break;

          case 'partial_transcript':
            if (message.transcript) {
              updatePartialTranscript(message.transcript);
            }
            break;

          case 'transcript':
            // Finalized transcript from turnComplete — the partial already has the final text
            if (message.transcript) {
              finalizeTranscript(message.transcript.speaker);
            }
            break;

          case 'interrupted':
            sourcesRef.current.forEach(s => { try { s.stop(); } catch (e) {} });
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;
            setAISpeaking(false);
            break;

          case 'question_changed':
            // Backend has updated to next question
            console.log('📝 Question changed:', message.questionIndex);
            // Update local session state to match backend
            if (message.questionIndex !== undefined) {
              updateSession({
                currentQuestionIndex: message.questionIndex,
                phase: message.question?.type || 'technical'
              });

              // Add transition transcript
              if (message.question) {
                addTranscript({
                  speaker: 'ai',
                  text: `Moving to next question: ${message.question.text}`,
                  timestamp: Date.now()
                });
              }
            }
            break;

          case 'evaluation_started':
            console.log('📊 Background evaluation started');
            // Could show a subtle indicator
            break;

          case 'evaluation_complete':
            console.log('✅ Evaluation complete:', message.evaluation);
            // Store evaluation result - could show feedback badge
            if (message.evaluation) {
              addTranscript({
                speaker: 'ai',
                text: `Evaluation complete: Score ${message.evaluation.score}/100`,
                timestamp: Date.now()
              });
            }
            break;

          case 'interview_complete':
            console.log('🎉 Interview complete');
            // Navigate to results page (handled in InterviewRoom)
            break;

          case 'state_changed':
            // Orchestrator state update
            console.log('🎭 State changed:', message.state);
            // Could update UI to reflect current state
            break;

          case 'disconnected':
            console.log('Session disconnected from server');
            setStatus('disconnected');
            break;

          case 'error':
            console.error('WebSocket error:', message.error);
            setStatus('error');
            break;
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('error');
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        setStatus('disconnected');
      };

    } catch (error) {
      console.error('Connection error:', error);
      setStatus('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, status]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    return () => { disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, connect, disconnect, sendMessage };
};
