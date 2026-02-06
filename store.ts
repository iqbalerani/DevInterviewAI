
import { create } from 'zustand';
import { InterviewSession, InterviewPhase, Question, TranscriptEntry } from './types';

interface AppState {
  session: InterviewSession | null;
  isAISpeaking: boolean;
  isAIThinking: boolean;
  hintsUsed: number;
  
  setSession: (session: InterviewSession | null) => void;
  updateSession: (updates: Partial<InterviewSession>) => void;
  setPhase: (phase: InterviewPhase) => void;
  addTranscript: (entry: TranscriptEntry) => void;
  updatePartialTranscript: (entry: TranscriptEntry) => void;
  finalizeTranscript: (speaker: 'user' | 'ai') => void;
  setAISpeaking: (speaking: boolean) => void;
  setAIThinking: (thinking: boolean) => void;
  incrementHints: () => void;
  resetSession: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  session: null,
  isAISpeaking: false,
  isAIThinking: false,
  hintsUsed: 0,

  setSession: (session) => set({ session }),
  updateSession: (updates) => set((state) => ({
    session: state.session ? { ...state.session, ...updates } : null
  })),
  setPhase: (phase) => set((state) => ({
    session: state.session ? { ...state.session, phase } : null
  })),
  addTranscript: (entry) => set((state) => ({
    session: state.session ? {
      ...state.session,
      transcripts: [...(state.session.transcripts || []), entry]
    } : null
  })),
  updatePartialTranscript: (entry) => set((state) => {
    if (!state.session) return {};
    const transcripts = [...(state.session.transcripts || [])];
    const lastIndex = transcripts.length - 1;
    const lastEntry = transcripts[lastIndex];
    if (lastEntry && lastEntry.isPartial && lastEntry.speaker === entry.speaker) {
      transcripts[lastIndex] = { ...entry, isPartial: true };
    } else {
      transcripts.push({ ...entry, isPartial: true });
    }
    return { session: { ...state.session, transcripts } };
  }),
  finalizeTranscript: (speaker) => set((state) => {
    if (!state.session) return {};
    const transcripts = [...(state.session.transcripts || [])];
    for (let i = transcripts.length - 1; i >= 0; i--) {
      if (transcripts[i].isPartial && transcripts[i].speaker === speaker) {
        transcripts[i] = { ...transcripts[i], isPartial: false };
        break;
      }
    }
    return { session: { ...state.session, transcripts } };
  }),
  setAISpeaking: (speaking) => set({ isAISpeaking: speaking }),
  setAIThinking: (thinking) => set({ isAIThinking: thinking }),
  incrementHints: () => set((state) => ({ hintsUsed: state.hintsUsed + 1 })),
  resetSession: () => set({ session: null, hintsUsed: 0, isAISpeaking: false, isAIThinking: false }),
}));
