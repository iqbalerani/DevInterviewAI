
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
