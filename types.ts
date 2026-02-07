
export enum InterviewPhase {
  INTRO = 'intro',
  BEHAVIORAL = 'behavioral',
  TECHNICAL = 'technical',
  CODING = 'coding',
  CLOSING = 'closing'
}

export interface Question {
  id: string;
  text: string;
  type: 'behavioral' | 'technical' | 'coding';
  difficulty: 'junior' | 'mid' | 'senior';
  expectedTopics?: string[];
  testCases?: { input: string; expectedOutput: string }[];
}

export interface TranscriptEntry {
  speaker: 'user' | 'ai';
  text: string;
  timestamp: number;
  isPartial?: boolean;
}

export interface InterviewSession {
  id: string;
  status: 'idle' | 'setup' | 'active' | 'completed';
  phase: InterviewPhase;
  startTime?: number;
  endTime?: number;
  resumeData?: any;
  jobDescription?: string;
  questions: Question[];
  currentQuestionIndex: number;
  transcripts: TranscriptEntry[];
  scores?: {
    technical: number;
    coding: number;
    communication: number;
    problemSolving: number;
  };
  skillChartUrl?: string;
  certificateUrl?: string;
}

export interface CodeState {
  code: string;
  language: string;
  output: string;
  isExecuting: boolean;
}

// Dashboard types

export interface QuestionEvaluationData {
  questionId: string;
  questionText: string;
  score: number;
  feedback: string;
  topicsCovered: string[];
}

export interface SessionEvaluationData {
  scores: {
    technical: number;
    coding: number;
    communication: number;
    problemSolving: number;
  };
  overallScore?: number;
  strengths?: string[];
  weaknesses?: string[];
  summary?: string;
  questionEvaluations?: QuestionEvaluationData[];
  learningPath?: string[];
  recommendedTopics?: string[];
}

export interface DashboardSession {
  id: string;
  status: 'idle' | 'setup' | 'active' | 'completed';
  createdAt: string;
  startTime?: string;
  endTime?: string;
  jobDescription: string;
  questions: Question[];
  evaluation: SessionEvaluationData | null;
}

export interface SkillProgressionPoint {
  date: string;
  overallScore: number;
  technical: number;
  coding: number;
  communication: number;
  problemSolving: number;
}

export interface DashboardStats {
  totalCompleted: number;
  totalSessions: number;
  averageScore: number;
  skillGrowth: number;
  averageDuration: number;
  recentSessions: DashboardSession[];
  skillProgression: SkillProgressionPoint[];
}

// Flashcard types

export type FlashcardDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type FlashcardStatus = 'unseen' | 'learning' | 'mastered';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  codeSnippet?: string;
  difficulty: FlashcardDifficulty;
  tags: string[];
}

export interface FlashcardDeck {
  id: string;
  title: string;
  description: string;
  icon: string;
  gradient: string;
  cards: Flashcard[];
  category: string;
}

export interface FlashcardProgress {
  deckId: string;
  cardStatuses: Record<string, FlashcardStatus>;
  lastStudiedAt: number;
  currentIndex: number;
}

// Quiz types

export type QuizDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type QuizAnswerStatus = 'correct' | 'incorrect' | 'unanswered';

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation: string;
  codeSnippet?: string;
  difficulty: QuizDifficulty;
  tags: string[];
}

export interface QuizDeck {
  id: string;
  title: string;
  description: string;
  icon: string;
  gradient: string;
  questions: QuizQuestion[];
  category: string;
}

export interface QuizProgress {
  deckId: string;
  answers: Record<string, { selectedOptionId: string | null; status: QuizAnswerStatus }>;
  lastAttemptedAt: number;
  currentIndex: number;
  completedAt?: number;
}

// Auth types

export interface ResumeMetadata {
  fileName: string;
  fileType: string;
  uploadedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'user' | 'admin';
  interviewsThisWeek: number;
  weekResetDate: string;
  resume: ResumeMetadata | null;
}

// Settings types

export interface UserSettings {
  fullName: string;
  email: string;
  role: string;
  bio: string;
  avatarColor: string;

  defaultDifficulty: 'junior' | 'mid' | 'senior';
  sessionDuration: number;
  preferredLanguage: string;

  emailNotifications: boolean;
  interviewReminders: boolean;
  weeklyProgress: boolean;
  achievementAlerts: boolean;

  theme: 'dark' | 'system';
  accentColor: string;
}
