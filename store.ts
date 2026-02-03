
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
      transcripts: [...state.session.transcripts, entry]
    } : null
  })),
  setAISpeaking: (speaking) => set({ isAISpeaking: speaking }),
  setAIThinking: (thinking) => set({ isAIThinking: thinking }),
  incrementHints: () => set((state) => ({ hintsUsed: state.hintsUsed + 1 })),
  resetSession: () => set({ session: null, hintsUsed: 0, isAISpeaking: false, isAIThinking: false }),
}));
