
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Award, Share2, Download, CheckCircle2, AlertCircle, RefreshCcw, Home, Copy, Check, Linkedin, Twitter, X, ChevronDown, MessageSquare, BookOpen, User, Bot } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { useAppStore } from '../store';
import { interviewService } from '../services/interviewService';
import { generateCertificatePDF } from '../services/certificateGenerator';
import { copyReportLink, shareToLinkedIn, shareToTwitter } from '../services/shareService';
import type { TranscriptEntry, QuestionEvaluationData } from '../types';

const scoreColors: Record<string, string> = {
  blue: 'text-blue-400',
  green: 'text-green-400',
  purple: 'text-purple-400',
  orange: 'text-orange-400',
};

const scoreBarColors: Record<string, string> = {
  blue: 'bg-blue-400',
  green: 'bg-green-400',
  purple: 'bg-purple-400',
  orange: 'bg-orange-400',
};

function getScoreDescriptor(score: number): string {
  if (score >= 81) return 'Excellent';
  if (score >= 61) return 'Proficient';
  if (score >= 31) return 'Developing';
  return 'Needs Improvement';
}

function getScoreColor(score: number): string {
  if (score >= 81) return 'text-green-400';
  if (score >= 61) return 'text-blue-400';
  if (score >= 31) return 'text-yellow-400';
  return 'text-red-400';
}

function formatDuration(session: any): string {
  if (!session?.startTime || !session?.endTime) return '';
  const start = new Date(session.startTime).getTime();
  const end = new Date(session.endTime).getTime();
  const diffMs = end - start;
  if (diffMs <= 0) return '';
  const totalSec = Math.round(diffMs / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}m ${secs}s`;
}

const Results: React.FC = () => {
  const { sessionId } = useParams();
  const { session: zustandSession, resetSession } = useAppStore();
  const [evaluation, setEvaluation] = useState<any>(null);
  const [session, setSession] = useState<any>(zustandSession);
  const [chartUrl, setChartUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const shareRef = useRef<HTMLDivElement>(null);

  // New state for enhanced sections
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [transcriptsLoading, setTranscriptsLoading] = useState(false);
  const [transcriptsLoaded, setTranscriptsLoaded] = useState(false);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  // Close share dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
      }
    };
    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showShareMenu]);

  useEffect(() => {
    const processResults = async () => {
      if (!sessionId) return;

      try {
        // Fetch session from API as fallback if Zustand state is empty (e.g. page refresh)
        if (!session) {
          try {
            const fetchedSession = await interviewService.getSession(sessionId);
            setSession(fetchedSession);
          } catch {
            // Session fetch is non-critical; evaluation can still load
          }
        }

        const result = await interviewService.evaluateSession(sessionId);
        setEvaluation(result);
      } catch (e) {
        console.error("Evaluation failed", e);
      } finally {
        setIsLoading(false);
      }
    };

    processResults();
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTranscripts = useCallback(async () => {
    if (transcriptsLoaded || !sessionId) return;
    setTranscriptsLoading(true);
    try {
      const data = await interviewService.getTranscripts(sessionId);
      setTranscripts(data || []);
      setTranscriptsLoaded(true);
    } catch {
      setTranscripts([]);
      setTranscriptsLoaded(true);
    } finally {
      setTranscriptsLoading(false);
    }
  }, [sessionId, transcriptsLoaded]);

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-6">
        <div className="w-20 h-20 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
        <div className="text-center">
          <h2 className="text-2xl font-bold">Generating Your Performance Report</h2>
          <p className="text-slate-400 mt-2">AI is analyzing your transcripts, code quality, and communication style...</p>
        </div>
      </div>
    );
  }

  // Check if evaluation data exists
  if (!evaluation || !evaluation.scores?.technical) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-6 p-8">
        <AlertCircle className="w-20 h-20 text-yellow-500" />
        <div className="text-center max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">No Evaluation Data Available</h2>
          <p className="text-slate-400 text-lg mb-8">
            The interview session did not generate sufficient data for evaluation.
            This may occur if the interview was ended early or no responses were recorded.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-700 transition-all"
          >
            <Home className="w-5 h-5" />
            Start New Interview
          </Link>
        </div>
      </div>
    );
  }

  const radarData = [
    { subject: 'Technical', A: evaluation.scores.technical, fullMark: 100 },
    { subject: 'Coding', A: evaluation.scores.coding, fullMark: 100 },
    { subject: 'Communication', A: evaluation.scores.communication, fullMark: 100 },
    { subject: 'Logic', A: evaluation.scores.problemSolving, fullMark: 100 },
  ];

  const overallScore = evaluation.overallScore ?? Math.round(
    (evaluation.scores.technical + evaluation.scores.coding + evaluation.scores.communication + evaluation.scores.problemSolving) / 4
  );

  const dimensions = [
    { key: 'technical', label: 'Technical', color: 'blue', score: evaluation.scores.technical },
    { key: 'coding', label: 'Coding', color: 'green', score: evaluation.scores.coding },
    { key: 'communication', label: 'Communication', color: 'purple', score: evaluation.scores.communication },
    { key: 'problemSolving', label: 'Problem Solving', color: 'orange', score: evaluation.scores.problemSolving },
  ];

  const questionEvals: QuestionEvaluationData[] = evaluation.questionEvaluations || [];
  const learningTopics: string[] = evaluation.learningPath || evaluation.recommendedTopics || [];
  const duration = formatDuration(session);

  const extractNameFromResume = (): string | null => {
    if (!session?.resumeData) return null;
    if (typeof session.resumeData === 'object' && session.resumeData.name) {
      return session.resumeData.name;
    }
    const raw = typeof session.resumeData === 'string' ? session.resumeData : session.resumeData?.raw;
    if (raw) {
      const firstLine = raw.split('\n')[0]?.trim();
      if (firstLine && /^[A-Z][a-zA-Z'-]+(?: [A-Z][a-zA-Z'-]+){0,3}$/.test(firstLine)) {
        return firstLine;
      }
    }
    return null;
  };

  const getJobTitle = (): string => {
    if (session?.jobDescription) {
      const firstLine = session.jobDescription.split('\n')[0]?.trim();
      return firstLine || 'Software Engineer';
    }
    return 'Software Engineer';
  };

  const handleDownloadCertificate = () => {
    const name = extractNameFromResume();
    if (name) {
      generateCertificatePDF({
        candidateName: name,
        sessionId: sessionId || '',
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        overallScore,
        scores: evaluation.scores,
        strengths: evaluation.strengths || [],
        jobTitle: getJobTitle(),
      });
    } else {
      setShowNamePrompt(true);
    }
  };

  const handleGenerateWithName = () => {
    if (!candidateName.trim()) return;
    generateCertificatePDF({
      candidateName: candidateName.trim(),
      sessionId: sessionId || '',
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      overallScore,
      scores: evaluation.scores,
      strengths: evaluation.strengths || [],
      jobTitle: getJobTitle(),
    });
    setShowNamePrompt(false);
    setCandidateName('');
  };

  const handleCopyLink = async () => {
    if (!sessionId) return;
    const ok = await copyReportLink(sessionId);
    if (ok) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
    setShowShareMenu(false);
  };

  const handleTranscriptToggle = () => {
    if (!transcriptOpen) {
      loadTranscripts();
    }
    setTranscriptOpen(!transcriptOpen);
  };

  // Find matching question metadata for a questionEvaluation
  const getQuestionMeta = (qe: QuestionEvaluationData) => {
    const questions = session?.questions || [];
    return questions.find((q: any) => q.id === qe.questionId);
  };

  return (
    <div className="max-w-6xl mx-auto p-8 pb-20 space-y-12 animate-in fade-in duration-1000">
      {/* Section A — Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-blue-500 font-bold text-sm uppercase tracking-widest mb-2">
            <Award className="w-4 h-4" />
            Interview Completed
          </div>
          <h2 className="text-4xl font-black">Performance Analytics</h2>
          <p className="text-slate-400 mt-2">Session ID: {sessionId}</p>
        </div>

        <div className="flex gap-4">
          {/* Share Report with dropdown */}
          <div className="relative" ref={shareRef}>
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all"
            >
              <Share2 className="w-5 h-5" />
              Share Report
            </button>
            {showShareMenu && (
              <div className="absolute top-full mt-2 right-0 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl shadow-black/40 overflow-hidden z-50">
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-3 w-full px-4 py-3 hover:bg-slate-700 transition-colors text-left"
                >
                  {copySuccess ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  <span>{copySuccess ? 'Link Copied!' : 'Copy Link'}</span>
                </button>
                <button
                  onClick={() => { if (sessionId) shareToLinkedIn(sessionId, overallScore); setShowShareMenu(false); }}
                  className="flex items-center gap-3 w-full px-4 py-3 hover:bg-slate-700 transition-colors text-left"
                >
                  <Linkedin className="w-4 h-4 text-blue-400" />
                  <span>Share on LinkedIn</span>
                </button>
                <button
                  onClick={() => { if (sessionId) shareToTwitter(sessionId, overallScore); setShowShareMenu(false); }}
                  className="flex items-center gap-3 w-full px-4 py-3 hover:bg-slate-700 transition-colors text-left"
                >
                  <Twitter className="w-4 h-4 text-sky-400" />
                  <span>Share on X</span>
                </button>
              </div>
            )}
          </div>

          {/* Download Certificate */}
          <button
            onClick={handleDownloadCertificate}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
          >
            <Download className="w-5 h-5" />
            Download Certificate
          </button>
        </div>
      </div>

      {/* Section B — Interview Summary Banner */}
      {evaluation.summary && (
        <div className="bg-slate-800/40 border border-slate-700 rounded-3xl p-8">
          <p className="text-slate-200 text-lg leading-relaxed">{evaluation.summary}</p>
          <div className="flex flex-wrap gap-3 mt-6">
            {session?.jobDescription && (
              <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm font-medium">
                {getJobTitle()}
              </span>
            )}
            {session?.questions?.[0]?.difficulty && (
              <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-sm font-medium capitalize">
                {session.questions[0].difficulty} level
              </span>
            )}
            {session?.questions?.length > 0 && (
              <span className="px-3 py-1 bg-slate-500/10 border border-slate-500/20 rounded-full text-slate-400 text-sm font-medium">
                {session.questions.length} questions
              </span>
            )}
            {duration && (
              <span className="px-3 py-1 bg-slate-500/10 border border-slate-500/20 rounded-full text-slate-400 text-sm font-medium">
                {duration}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Section C — Score Overview */}
          <div className="bg-slate-800/40 border border-slate-700 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="text-center space-y-4">
              <div className="relative inline-block">
                <svg className="w-48 h-48 transform -rotate-90">
                  <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-700" />
                  <circle
                    cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent"
                    strokeDasharray={552.92} strokeDashoffset={552.92 - (552.92 * overallScore) / 100}
                    className="text-blue-500 transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-black">{overallScore}</span>
                  <span className="text-xs text-slate-400 uppercase font-bold">Overall Rating</span>
                </div>
              </div>
              <div>
                <h4 className="text-2xl font-bold">{getScoreDescriptor(overallScore)}</h4>
                <p className="text-slate-400">Based on industry standards for {session?.questions?.[0]?.difficulty || 'mid'} level.</p>
              </div>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={12} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Candidate" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Dimension Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {dimensions.map((dim) => (
              <div key={dim.key} className="bg-slate-800/40 border border-slate-700 rounded-2xl p-5">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">{dim.label}</p>
                <p className={`text-3xl font-black ${scoreColors[dim.color]}`}>{dim.score}</p>
                <div className="w-full h-1.5 bg-slate-700 rounded-full mt-3">
                  <div
                    className={`h-1.5 rounded-full ${scoreBarColors[dim.color]} transition-all duration-1000 ease-out`}
                    style={{ width: `${dim.score}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">{getScoreDescriptor(dim.score)}</p>
              </div>
            ))}
          </div>

          {/* Section D — Per-Question Breakdown */}
          {questionEvals.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-400" />
                Question-by-Question Analysis
              </h3>
              {questionEvals.map((qe, index) => {
                const meta = getQuestionMeta(qe);
                const isExpanded = expandedQuestionId === qe.questionId;
                const displayText = qe.questionText || meta?.text || `Question ${index + 1}`;
                return (
                  <div key={qe.questionId} className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setExpandedQuestionId(isExpanded ? null : qe.questionId)}
                      className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-800/60 transition-colors"
                    >
                      <span className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-sm font-bold shrink-0">
                        {index + 1}
                      </span>
                      <span className="flex-1 text-slate-200 font-medium line-clamp-1">{displayText}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        {meta?.type && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-700 text-slate-300 capitalize">
                            {meta.type}
                          </span>
                        )}
                        {meta?.difficulty && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-700 text-slate-300 capitalize">
                            {meta.difficulty}
                          </span>
                        )}
                        <span className={`text-lg font-bold ${getScoreColor(qe.score)}`}>{qe.score}</span>
                        <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-5 pb-5 border-t border-slate-700 pt-4 space-y-4">
                        <p className="text-slate-300 leading-relaxed">{qe.feedback}</p>
                        {qe.topicsCovered?.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {qe.topicsCovered.map((topic, i) => (
                              <span key={i} className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-xs font-medium">
                                {topic}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Section E — Strengths & Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {evaluation.strengths && evaluation.strengths.length > 0 && (
              <div className="bg-green-500/5 border border-green-500/20 rounded-3xl p-8">
                <h4 className="flex items-center gap-2 text-green-500 font-bold mb-6">
                  <CheckCircle2 className="w-5 h-5" />
                  Key Strengths
                </h4>
                <ul className="space-y-4">
                  {evaluation.strengths.map((s: string, i: number) => (
                    <li key={i} className="flex gap-3 text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {evaluation.weaknesses && evaluation.weaknesses.length > 0 && (
              <div className="bg-orange-500/5 border border-orange-500/20 rounded-3xl p-8">
                <h4 className="flex items-center gap-2 text-orange-500 font-bold mb-6">
                  <AlertCircle className="w-5 h-5" />
                  Areas for Improvement
                </h4>
                <ul className="space-y-4">
                  {evaluation.weaknesses.map((w: string, i: number) => (
                    <li key={i} className="flex gap-3 text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 shrink-0" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Section F — Full Transcript Viewer */}
          <div className="bg-slate-800/40 border border-slate-700 rounded-3xl overflow-hidden">
            <button
              onClick={handleTranscriptToggle}
              className="w-full flex items-center justify-between p-6 hover:bg-slate-800/60 transition-colors"
            >
              <h4 className="flex items-center gap-2 font-bold">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                Full Interview Transcript
              </h4>
              <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${transcriptOpen ? 'rotate-180' : ''}`} />
            </button>
            {transcriptOpen && (
              <div className="border-t border-slate-700 p-6">
                {transcriptsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                    <span className="ml-3 text-slate-400">Loading transcript...</span>
                  </div>
                ) : transcripts.length > 0 ? (
                  <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
                    {transcripts.map((t, i) => (
                      <div
                        key={i}
                        className={`flex gap-3 ${t.speaker === 'user' ? 'flex-row-reverse' : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          t.speaker === 'ai' ? 'bg-blue-500/20' : 'bg-slate-600'
                        }`}>
                          {t.speaker === 'ai' ? <Bot className="w-4 h-4 text-blue-400" /> : <User className="w-4 h-4 text-slate-300" />}
                        </div>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                          t.speaker === 'ai'
                            ? 'bg-slate-700/50 text-slate-200'
                            : 'bg-blue-600/20 text-slate-200'
                        }`}>
                          <p className="text-sm leading-relaxed">{t.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-8">No transcript data available</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {chartUrl && (
            <div className="bg-slate-800/40 border border-slate-700 rounded-3xl p-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">Skill Visualization</h4>
              <img src={chartUrl} alt="Skill Radar" className="w-full h-auto rounded-2xl shadow-xl" />
            </div>
          )}

          <div className="bg-slate-800/40 border border-slate-700 rounded-3xl p-8">
            <h4 className="text-xl font-bold mb-6">Learning Path</h4>
            <div className="space-y-6">
              {learningTopics.length > 0 ? (
                learningTopics.map((topic, i) => (
                  <div key={i} className="flex gap-3 group cursor-pointer">
                    <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="font-medium text-slate-200 group-hover:text-blue-400 transition-colors">{topic}</p>
                  </div>
                ))
              ) : (
                [
                  { title: 'System Design Fundamentals', platform: 'Coursera', time: '12h' },
                  { title: 'Advanced React Patterns', platform: 'Frontend Masters', time: '8h' },
                  { title: 'Database Indexing Deep-dive', platform: 'Udemy', time: '5h' },
                ].map((course, i) => (
                  <div key={i} className="group cursor-pointer">
                    <p className="font-bold text-slate-200 group-hover:text-blue-400 transition-colors">{course.title}</p>
                    <p className="text-xs text-slate-500">{course.platform} &bull; {course.time}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <Link
              to="/interview/setup"
              onClick={resetSession}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 py-4 rounded-2xl font-bold transition-all"
            >
              <RefreshCcw className="w-5 h-5" />
              Retake
            </Link>
            <Link
              to="/"
              onClick={resetSession}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-bold transition-all"
            >
              <Home className="w-5 h-5" />
              Home
            </Link>
          </div>
        </div>
      </div>
      {/* Name Prompt Modal */}
      {showNamePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Enter Your Name</h3>
              <button onClick={() => { setShowNamePrompt(false); setCandidateName(''); }} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-400 text-sm mb-4">Your name will appear on the certificate.</p>
            <input
              type="text"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateWithName(); }}
              placeholder="e.g. John Doe"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              autoFocus
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowNamePrompt(false); setCandidateName(''); }}
                className="flex-1 py-3 rounded-xl border border-slate-700 hover:border-slate-500 font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateWithName}
                disabled={!candidateName.trim()}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Generate Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Results;
