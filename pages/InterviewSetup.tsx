
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Briefcase, Zap, CheckCircle2, Upload, BarChart3, ChevronRight, Sparkles, Cpu, ShieldCheck, Globe, AlertCircle } from 'lucide-react';
import { useAppStore } from '../store';
import { interviewService } from '../services/interviewService';
import { InterviewPhase, InterviewSession } from '../types';

const DUMMY_ROLES = [
  {
    id: 'frontend',
    title: 'Senior Frontend Engineer',
    jd: `Role: Senior Frontend Engineer
Stack: React, TypeScript, Next.js, Tailwind CSS.
Requirements: 
- 5+ years experience building highly interactive web applications.
- Expertise in web performance, accessibility (a11y), and state management (Zustand/Redux).
- Experience with Unit and E2E testing (Jest/Cypress).
- Strong eye for UI/UX and design system architecture.`
  },
  {
    id: 'backend',
    title: 'Backend Systems Engineer',
    jd: `Role: Backend Systems Engineer
Stack: Node.js, Go, PostgreSQL, Redis, Kubernetes.
Requirements:
- Deep understanding of distributed systems and microservices.
- Experience designing scalable APIs (REST/GraphQL/gRPC).
- Strong SQL optimization skills and experience with NoSQL databases.
- Familiarity with event-driven architecture and message brokers (Kafka/RabbitMQ).`
  },
  {
    id: 'fullstack',
    title: 'Fullstack Product Engineer',
    jd: `Role: Fullstack Product Engineer
Stack: React, Node.js, AWS, Serverless.
Requirements:
- Proven ability to ship full-featured products from scratch.
- Proficiency in both modern frontend frameworks and backend runtime environments.
- Experience with CI/CD pipelines and cloud infrastructure management.
- Strong product mindset and ability to work closely with design and product teams.`
  }
];

const LOADING_STEPS = [
  { icon: FileText, message: "Parsing technical experience profile..." },
  { icon: Briefcase, message: "Synthesizing Job Description requirements..." },
  { icon: Cpu, message: "Architecting custom coding challenges..." },
  { icon: Sparkles, message: "Generating behavioral interview scenarios..." },
  { icon: ShieldCheck, message: "Calibrating AI interviewer persona..." },
  { icon: Globe, message: "Finalizing virtual environment setup..." }
];

const InterviewSetup: React.FC = () => {
  const navigate = useNavigate();
  const { setSession } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [resume, setResume] = useState('');
  const [jd, setJd] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isRanking, setIsRanking] = useState(false);
  const [rankResult, setRankResult] = useState<any>(null);
  const [level, setLevel] = useState<'junior' | 'mid' | 'senior'>('mid');
  const [error, setError] = useState<string | null>(null);
  
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    let interval: number;
    if (isParsing) {
      interval = window.setInterval(() => {
        setLoadingStep((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [isParsing]);

  const handleStart = async () => {
    if (!resume || !jd) return;

    setError(null);
    setIsParsing(true);
    setLoadingStep(0);

    try {
      // Generate interview plan via backend API
      const plan = await interviewService.generateInterviewPlan(resume, jd);

      if (!plan || plan.length === 0) {
        throw new Error("Could not generate a valid interview plan.");
      }

      // Create session in backend database
      const newSession = await interviewService.createSession(resume, jd, plan);

      // Store session in Zustand for frontend state
      setSession(newSession);

      // UX delay for the final step of loading animation
      setTimeout(() => {
        navigate(`/interview/room/${newSession.id}`);
      }, 800);

    } catch (e) {
      console.error("Start Session Error:", e);
      setError("AI was unable to generate your session. Please check your inputs and try again.");
      setIsParsing(false);
    }
  };

  const handleCheckRank = async () => {
    if (!resume || !jd) return;
    setIsRanking(true);
    setError(null);
    try {
      const result = await interviewService.calculateMatchScore(resume, jd);
      setRankResult(result);
    } catch (e) {
      console.error(e);
      setError("Ranking failed. Please try again.");
    } finally {
      setIsRanking(false);
    }
  };

  const triggerFileSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setResume(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-6xl mx-auto p-12 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32">
      {/* Loading Overlay */}
      {isParsing && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
          <div className="max-w-md w-full space-y-8">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-blue-600/20 border-t-blue-500 rounded-full animate-spin mx-auto" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-blue-400 animate-pulse" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-white">Architecting Experience</h2>
              <p className="text-slate-400">Tailoring your interview environment for deep technical validation.</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-left space-y-4 shadow-2xl">
              {LOADING_STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isCurrent = idx === loadingStep;
                const isDone = idx < loadingStep;
                
                return (
                  <div key={idx} className={`flex items-center gap-4 transition-all duration-500 ${isCurrent ? 'opacity-100 scale-105' : isDone ? 'opacity-50' : 'opacity-20'}`}>
                    <div className={`p-2 rounded-lg ${isCurrent ? 'bg-blue-500 text-white' : isDone ? 'bg-green-500/20 text-green-500' : 'bg-slate-800 text-slate-600'}`}>
                      {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <span className={`text-sm font-medium ${isCurrent ? 'text-blue-400' : isDone ? 'text-slate-300' : 'text-slate-600'}`}>
                      {step.message}
                    </span>
                  </div>
                );
              })}
            </div>
            
            <div className="pt-4">
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-1000 ease-out"
                  style={{ width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="text-center space-y-4">
        <h2 className="text-5xl font-extrabold tracking-tight">Setup Your AI Interview</h2>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Upload your context to generate a high-fidelity technical practice session.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-500 text-sm animate-in shake duration-500">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest px-2">
            <FileText className="w-4 h-4 text-blue-500" />
            Candidate Resume
          </label>
          <div className="relative h-96 group rounded-[2.5rem] overflow-hidden border-2 border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-all focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20">
            <input type="file" ref={fileInputRef} className="hidden" accept=".txt,.md" onChange={handleFileChange} />
            <textarea
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              placeholder="Paste your resume or experience details here..."
              className="w-full h-full bg-transparent p-8 text-slate-200 outline-none resize-none z-10 relative scrollbar-hide font-mono text-sm leading-relaxed"
            />
            {!resume && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 opacity-40">
                  <Upload className="w-16 h-16 text-slate-400" />
                  <p className="text-slate-300 font-medium text-lg">Select Text File or Paste</p>
                  <button onClick={triggerFileSelect} className="pointer-events-auto mt-4 px-6 py-2 bg-slate-800 text-blue-400 rounded-xl hover:bg-slate-700 transition-all font-bold text-sm">
                    Upload Resume (.txt)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <Briefcase className="w-4 h-4 text-purple-500" />
              Job Description
            </label>
            <div className="flex gap-2">
               {DUMMY_ROLES.map(role => (
                 <button 
                  key={role.id}
                  onClick={() => { setJd(role.jd); setError(null); }}
                  className="px-2 py-1 text-[10px] font-bold bg-slate-800 text-slate-400 rounded-lg hover:bg-slate-700 hover:text-white transition-all border border-slate-700"
                 >
                   {role.id.charAt(0).toUpperCase() + role.id.slice(1)}
                 </button>
               ))}
            </div>
          </div>
          <div className="h-96 rounded-[2.5rem] border-2 border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-all focus-within:border-purple-600 focus-within:ring-2 focus-within:ring-purple-600/20">
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the target Job Description..."
              className="w-full h-full bg-transparent p-8 text-slate-200 outline-none resize-none scrollbar-hide font-mono text-sm leading-relaxed"
            />
          </div>
        </div>
      </div>

      {(resume && jd) && (
        <div className="animate-in slide-in-from-top-4 duration-500">
           {!rankResult ? (
             <button 
               onClick={handleCheckRank}
               disabled={isRanking}
               className="flex items-center gap-2 mx-auto px-10 py-3.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-full font-black transition-all disabled:opacity-50"
             >
               {isRanking ? (
                 <><div className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin" /> Cross-Referencing Context...</>
               ) : (
                 <><BarChart3 className="w-5 h-5 text-blue-400" /> Analyze Profile Match</>
               )}
             </button>
           ) : (
             <div className="bg-blue-600/5 border border-blue-500/20 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center gap-10 animate-in zoom-in-95 duration-300">
                <div className="relative w-36 h-36 flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="72" cy="72" r="66" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-800" />
                    <circle 
                      cx="72" cy="72" r="66" stroke="currentColor" strokeWidth="10" fill="transparent" 
                      strokeDasharray={414.69} strokeDashoffset={414.69 - (414.69 * rankResult.score) / 100} 
                      className="text-blue-500 transition-all duration-1000 ease-out" 
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black">{rankResult.score}%</span>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Match</span>
                  </div>
                </div>
                <div className="flex-1 space-y-5">
                  <h4 className="text-xl font-bold text-slate-100">Compatibility Insights</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {rankResult.findings.map((finding: string, i: number) => (
                      <div key={i} className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 text-xs text-slate-400 flex gap-3 shadow-inner">
                        <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                        {finding}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-slate-400 italic bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                    " {rankResult.recommendation} "
                  </p>
                </div>
                <button onClick={() => setRankResult(null)} className="text-slate-500 hover:text-slate-300 text-xs font-black uppercase tracking-widest underline underline-offset-4">Dismiss</button>
             </div>
           )}
        </div>
      )}

      <div className="bg-[#0f172a] border border-slate-800 p-12 rounded-[3rem] shadow-2xl relative">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-10 mb-12">
          <div className="space-y-6">
            <h3 className="font-bold text-2xl text-slate-200">Interview Seniority</h3>
            <div className="flex gap-4">
              {(['junior', 'mid', 'senior'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`px-10 py-3 rounded-2xl border-2 capitalize transition-all font-black min-w-[130px] text-sm ${
                    level === l 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-[0_0_30px_rgba(37,99,235,0.3)]' 
                    : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-5 md:items-end">
            <div className="flex items-center gap-3 text-slate-400 text-xs font-bold uppercase tracking-widest">
              <Zap className="w-4 h-4 text-yellow-500" />
              Dynamic Adaptive Difficulty
            </div>
            <div className="flex items-center gap-3 text-slate-400 text-xs font-bold uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              Encrypted Local Session
            </div>
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={!resume || !jd || isParsing}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed text-white py-7 rounded-[2rem] font-black text-2xl flex items-center justify-center gap-5 transition-all transform active:scale-[0.98] shadow-2xl shadow-blue-900/50 group"
        >
          {isParsing ? 'Initializing AI Engine...' : 'Generate Practice Experience'}
          {!isParsing && <ChevronRight className="w-7 h-7 group-hover:translate-x-2 transition-transform" />}
        </button>
      </div>
    </div>
  );
};

export default InterviewSetup;
