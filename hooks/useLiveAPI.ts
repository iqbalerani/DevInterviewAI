
import { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { useAppStore } from '../store';

const SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
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

export const useLiveAPI = (systemInstruction: string) => {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  const { addTranscript, setAISpeaking } = useAppStore();
  const currentTranscriptionRef = useRef({ user: '', ai: '' });

  const disconnect = useCallback(() => {
    console.log("Live API: Disconnecting...");
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
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
      try { s.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();
    setStatus('disconnected');
    setAISpeaking(false);
  }, [setAISpeaking]);

  const connect = useCallback(async () => {
    if (status !== 'disconnected') return;
    
    setStatus('connecting');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Initialize Contexts
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: SAMPLE_RATE });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });

      // Load AudioWorklet module
      await audioContextRef.current.audioWorklet.addModule('/audio-processor.js');

      // Explicitly resume to bypass browser restrictions immediately
      await audioContextRef.current.resume();
      await outputAudioContextRef.current.resume();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: systemInstruction + "\nMaintain this session until closed. Keep interactions natural and concise.",
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: async () => {
            console.log("Live API: Connected");
            setStatus('connected');

            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const workletNode = new AudioWorkletNode(audioContextRef.current!, 'audio-input-processor');

            sourceNodeRef.current = source;
            workletNodeRef.current = workletNode;

            // Handle audio data from worklet
            workletNode.port.onmessage = (event) => {
              if (event.data.type === 'audio-data') {
                sessionPromise.then(s => {
                  if (s) {
                    s.sendRealtimeInput({
                      media: { data: encode(new Uint8Array(event.data.data)), mimeType: 'audio/pcm;rate=16000' }
                    });
                  }
                });
              }
            };

            source.connect(workletNode);
            workletNode.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              currentTranscriptionRef.current.ai += message.serverContent.outputTranscription.text;
            } else if (message.serverContent?.inputTranscription) {
              currentTranscriptionRef.current.user += message.serverContent.inputTranscription.text;
            }

            if (message.serverContent?.turnComplete) {
              if (currentTranscriptionRef.current.user.trim()) {
                addTranscript({ speaker: 'user', text: currentTranscriptionRef.current.user, timestamp: Date.now() });
                currentTranscriptionRef.current.user = '';
              }
              if (currentTranscriptionRef.current.ai.trim()) {
                addTranscript({ speaker: 'ai', text: currentTranscriptionRef.current.ai, timestamp: Date.now() });
                currentTranscriptionRef.current.ai = '';
              }
            }

            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              setAISpeaking(true);
              const ctx = outputAudioContextRef.current;
              if (ctx && ctx.state !== 'closed') {
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                try {
                  const buffer = await decodeAudioData(decode(audioData), ctx, OUTPUT_SAMPLE_RATE);
                  const source = ctx.createBufferSource();
                  source.buffer = buffer;
                  source.connect(ctx.destination);
                  source.onended = () => {
                    sourcesRef.current.delete(source);
                    if (sourcesRef.current.size === 0) setAISpeaking(false);
                  };
                  source.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += buffer.duration;
                  sourcesRef.current.add(source);
                } catch (e) {
                  console.error("Audio playback error:", e);
                }
              }
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setAISpeaking(false);
            }
          },
          onclose: (e) => {
            console.warn("Live API: Closed", e);
            setStatus('disconnected');
          },
          onerror: (e) => {
            console.error("Live API: Error", e);
            setStatus('error');
          },
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Live API Setup Error:", err);
      setStatus('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    return () => { disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, connect, disconnect };
};
