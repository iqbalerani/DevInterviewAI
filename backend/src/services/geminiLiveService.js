import { GoogleGenAI, Modality } from '@google/genai';
import { Session } from '../models/Session.js';
import { Transcript } from '../models/Transcript.js';

const SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

function encode(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return Buffer.from(binary, 'binary').toString('base64');
}

export class GeminiLiveService {
  constructor() {
    this.sessions = new Map(); // sessionId -> { liveSession, transcripts }
  }

  async connectSession(sessionId, systemInstruction, callbacks) {
    try {
      console.log(`🔧 [GeminiLiveService] Starting connection for session: ${sessionId}`);

      // Check API key
      const hasApiKey = !!process.env.GEMINI_API_KEY;
      console.log(`🔑 [GeminiLiveService] API Key present: ${hasApiKey}`);
      if (!hasApiKey) {
        throw new Error('GEMINI_API_KEY not found in environment variables');
      }

      console.log(`🔧 [GeminiLiveService] Creating GoogleGenAI client...`);
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const currentTranscription = { user: '', ai: '' };

      console.log(`🔧 [GeminiLiveService] Connecting to Gemini Live API (model: gemini-2.5-flash-native-audio-preview-12-2025)...`);

      // Create connection promise with 10-second timeout
      const connectionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' }
            }
          },
          systemInstruction: systemInstruction + "\nMaintain this session until closed. Keep interactions natural and concise.",
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            console.log(`✅ Live API Connected for session: ${sessionId}`);
            callbacks.onOpen?.();
          },
          onmessage: async (message) => {
            // Handle transcriptions — stream partial transcripts live
            if (message.serverContent?.outputTranscription) {
              currentTranscription.ai += message.serverContent.outputTranscription.text;
              callbacks.onPartialTranscript?.({
                speaker: 'ai',
                text: currentTranscription.ai,
                timestamp: Date.now(),
                isPartial: true
              });
            } else if (message.serverContent?.inputTranscription) {
              currentTranscription.user += message.serverContent.inputTranscription.text;
              callbacks.onPartialTranscript?.({
                speaker: 'user',
                text: currentTranscription.user,
                timestamp: Date.now(),
                isPartial: true
              });
            }

            // Save transcripts on turn complete
            if (message.serverContent?.turnComplete) {
              if (currentTranscription.user.trim()) {
                await this.saveTranscript(sessionId, 'user', currentTranscription.user);
                callbacks.onTranscript?.({
                  speaker: 'user',
                  text: currentTranscription.user,
                  timestamp: Date.now()
                });
                currentTranscription.user = '';
              }
              if (currentTranscription.ai.trim()) {
                await this.saveTranscript(sessionId, 'ai', currentTranscription.ai);
                callbacks.onTranscript?.({
                  speaker: 'ai',
                  text: currentTranscription.ai,
                  timestamp: Date.now()
                });
                currentTranscription.ai = '';
              }
              callbacks.onTurnComplete?.();
            }

            // Forward audio data to client
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              callbacks.onAudioData?.(audioData);
            }

            // Handle interruptions
            if (message.serverContent?.interrupted) {
              callbacks.onInterrupted?.();
            }
          },
          onclose: (event) => {
            console.log(`🔌 Live API Closed for session: ${sessionId}`, event);
            this.sessions.delete(sessionId);
            callbacks.onClose?.(event);
          },
          onerror: (error) => {
            console.error(`❌ Live API Error for session: ${sessionId}`, error);
            callbacks.onError?.(error);
          },
        }
      });

      // Create timeout promise (10 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Gemini Live API connection timeout after 10 seconds for session ${sessionId}`));
        }, 10000);
      });

      // Race between connection and timeout
      console.log(`⏱️  [GeminiLiveService] Starting connection race with 10s timeout...`);
      const liveSession = await Promise.race([connectionPromise, timeoutPromise]);

      console.log(`✅ [GeminiLiveService] Live session object created for ${sessionId}`);
      this.sessions.set(sessionId, { liveSession });
      console.log(`✅ [GeminiLiveService] Session stored in map. Total sessions: ${this.sessions.size}`);
      return liveSession;
    } catch (error) {
      console.error(`❌ [GeminiLiveService] Failed to connect Gemini Live API for ${sessionId}:`, error);
      console.error(`❌ [GeminiLiveService] Error name: ${error.name}`);
      console.error(`❌ [GeminiLiveService] Error message: ${error.message}`);
      console.error(`❌ [GeminiLiveService] Error stack:`, error.stack);
      throw error;
    }
  }

  sendAudioData(sessionId, audioData) {
    const session = this.sessions.get(sessionId);
    if (session?.liveSession) {
      try {
        session.liveSession.sendRealtimeInput({
          media: {
            data: encode(audioData),
            mimeType: 'audio/pcm;rate=16000'
          }
        });
      } catch (error) {
        console.error('Error sending audio data:', error);
      }
    }
  }

  async saveTranscript(sessionId, speaker, text) {
    try {
      await Transcript.create({
        sessionId,
        speaker,
        text,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error saving transcript:', error);
    }
  }

  /**
   * Send context update to existing Live API session (NO RECONNECT)
   * Used when transitioning between questions
   */
  async sendContextUpdate(sessionId, nextQuestion, candidateProfile, runningAssessment) {
    const session = this.sessions.get(sessionId);
    if (!session?.liveSession) {
      console.warn(`Cannot send context update: session ${sessionId} not found`);
      return false;
    }

    try {
      const contextUpdate = this.buildContextUpdate(nextQuestion, candidateProfile, runningAssessment);

      // Send context update using sendRealtimeInput
      session.liveSession.sendRealtimeInput({
        text: contextUpdate
      });

      console.log(`📝 Context updated for session ${sessionId}, question ${nextQuestion.id}`);
      return true;

    } catch (error) {
      console.error('Error sending context update:', error);
      return false;
    }
  }

  /**
   * Build context update payload with structured memory
   */
  buildContextUpdate(question, profile, assessment) {
    return `
[CONTEXT UPDATE]
Previous question complete. Evaluation in progress.

NEW QUESTION: "${question.text}"
Type: ${question.type}
Difficulty: ${question.difficulty}

CANDIDATE PROFILE: ${profile?.summary || 'Resume-based candidate'}
RUNNING ASSESSMENT: ${assessment?.summary || 'Interview in progress'}

INSTRUCTIONS:
- Acknowledge transition briefly (5 words max: "Alright, moving to next question")
- Ask this question ONLY
- Listen without interrupting
- Wait for candidate to finish speaking completely
- Do NOT reference previous questions
- Do NOT ask follow-up questions unless critically needed
- Keep responses concise

BEGIN NOW.
    `.trim();
  }

  /**
   * Interrupt AI speaking (for barge-in)
   */
  async interruptSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session?.liveSession) {
      return false;
    }

    try {
      // Send interrupt signal to Live API
      session.liveSession.interrupt();

      console.log(`🛑 Interrupted AI speech for session ${sessionId}`);
      return true;

    } catch (error) {
      console.error('Error interrupting session:', error);
      return false;
    }
  }

  disconnectSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session?.liveSession) {
      try {
        session.liveSession.close();
        this.sessions.delete(sessionId);
        console.log(`🔌 Disconnected session: ${sessionId}`);
      } catch (error) {
        console.error('Error disconnecting session:', error);
      }
    }
  }
}

export const geminiLiveService = new GeminiLiveService();
