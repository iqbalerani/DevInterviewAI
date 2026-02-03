
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

export const useLiveAPI = (systemInstruction: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  const { addTranscript, setAISpeaking } = useAppStore();
  const currentTranscriptionRef = useRef({ user: '', ai: '' });

  const connect = useCallback(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: SAMPLE_RATE });
    outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
        systemInstruction,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => {
          setIsConnected(true);
          const source = audioContextRef.current!.createMediaStreamSource(stream);
          const processor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
          
          processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              int16[i] = inputData[i] * 32768;
            }
            sessionPromise.then(s => s.sendRealtimeInput({
              media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' }
            }));
          };
          
          source.connect(processor);
          processor.connect(audioContextRef.current!.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          // Transcription handling
          if (message.serverContent?.outputTranscription) {
            currentTranscriptionRef.current.ai += message.serverContent.outputTranscription.text;
          } else if (message.serverContent?.inputTranscription) {
            currentTranscriptionRef.current.user += message.serverContent.inputTranscription.text;
          }

          if (message.serverContent?.turnComplete) {
            if (currentTranscriptionRef.current.user) {
              addTranscript({ speaker: 'user', text: currentTranscriptionRef.current.user, timestamp: Date.now() });
              currentTranscriptionRef.current.user = '';
            }
            if (currentTranscriptionRef.current.ai) {
              addTranscript({ speaker: 'ai', text: currentTranscriptionRef.current.ai, timestamp: Date.now() });
              currentTranscriptionRef.current.ai = '';
            }
          }

          // Audio handling
          const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (audioData) {
            setAISpeaking(true);
            const ctx = outputAudioContextRef.current!;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
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
          }

          if (message.serverContent?.interrupted) {
            sourcesRef.current.forEach(s => s.stop());
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;
            setAISpeaking(false);
          }
        },
        onclose: () => setIsConnected(false),
        onerror: (e) => console.error("Live API Error:", e),
      }
    });

    sessionRef.current = await sessionPromise;
  }, [systemInstruction, addTranscript, setAISpeaking]);

  const disconnect = useCallback(() => {
    if (sessionRef.current) sessionRef.current.close();
    setIsConnected(false);
  }, []);

  return { isConnected, connect, disconnect };
};
