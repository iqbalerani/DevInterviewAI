
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Briefcase, Zap, CheckCircle2, Upload } from 'lucide-react';
import { useAppStore } from '../store';
import { geminiService } from '../services/geminiService';
import { InterviewPhase } from '../types';

const InterviewSetup: React.FC = () => {
  const navigate = useNavigate();
  const { setSession } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  
  const [resume, setResume] = useState('');
  const [jd, setJd] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [level, setLevel] = useState<'junior' | 'mid' | 'senior'>('mid');

  const handleStart = async () => {
    if (!resume || !jd) return;
    
    setIsParsing(true);
    try {
      const plan = await geminiService.generateInterviewPlan(resume, jd);
      
      const newSession = {
        id: Math.random().toString(36).substr(2, 9),
        status: 'active' as const,
        phase: InterviewPhase.INTRO,
        startTime: Date.now(),
        resumeData: resume,
        jobDescription: jd,
        questions: plan,
        currentQuestionIndex: 0,
        transcripts: [],
      };
      
      setSession(newSession);
      navigate(`/interview/room/${newSession.id}`);
    } catch (e) {
      console.error(e);
      alert("Failed to generate interview plan. Please check your inputs.");
    } finally {
      setIsParsing(false);
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
    
    if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      reader.readAsText(file);
    } else {
      setResume(`[Uploaded: ${file.name}]\n\n(Note: Binary extraction is simulated in this preview. For accurate analysis, please paste your resume text directly.)`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-12 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-4">
        <h2 className="text-5xl font-extrabold tracking-tight">Setup Your AI Interview</h2>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          The more context you provide, the more realistic and helpful the interview will be.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Resume Area */}
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-widest">
            <FileText className="w-4 h-4 text-blue-500" />
            PASTE YOUR RESUME
          </label>
          <div className="relative h-96 group rounded-3xl overflow-hidden border-2 border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-all focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".pdf,.txt,.doc,.docx" 
              onChange={handleFileChange}
            />
            <textarea
              value={resume}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onChange={(e) => setResume(e.target.value)}
              placeholder="Paste your experience, skills, and projects here..."
              className="w-full h-full bg-transparent p-8 text-slate-200 outline-none resize-none z-10 relative scrollbar-hide"
            />
            {!resume && !isFocused && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 opacity-40">
                  <Upload className="w-16 h-16 text-slate-400" />
                  <p className="text-slate-300 font-medium text-lg">Drag & Drop PDF or Paste</p>
                  <button 
                    onClick={triggerFileSelect}
                    className="pointer-events-auto mt-4 px-6 py-2 bg-slate-800 text-blue-400 rounded-xl hover:bg-slate-700 transition-all font-bold text-sm"
                  >
                    Select File
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Job Description Area */}
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-widest">
            <Briefcase className="w-4 h-4 text-purple-500" />
            TARGET JOB DESCRIPTION
          </label>
          <div className="h-96 rounded-3xl border-2 border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-all focus-within:border-purple-600 focus-within:ring-2 focus-within:ring-purple-600/20">
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the job description you're preparing for..."
              className="w-full h-full bg-transparent p-8 text-slate-200 outline-none resize-none scrollbar-hide"
            />
          </div>
        </div>
      </div>

      <div className="bg-[#0f172a] border border-slate-800 p-10 rounded-[2.5rem] shadow-2xl relative">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-10">
          <div className="space-y-4">
            <h3 className="font-bold text-xl text-slate-200">Target Seniority</h3>
            <div className="flex gap-4">
              {(['junior', 'mid', 'senior'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`px-8 py-2.5 rounded-full border-2 capitalize transition-all font-bold min-w-[110px] text-sm ${
                    level === l 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-600/20' 
                    : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 md:items-end">
            <div className="flex items-center gap-3 text-slate-400 text-sm font-medium">
              <Zap className="w-5 h-5 text-yellow-500" />
              Adaptive Difficulty Enabled
            </div>
            <div className="flex items-center gap-3 text-slate-400 text-sm font-medium">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Proctoring Disabled
            </div>
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={!resume || !jd || isParsing}
          className="w-full bg-[#1e40af] hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed text-white py-6 rounded-2xl font-bold text-xl flex items-center justify-center gap-4 transition-all transform active:scale-[0.99] shadow-2xl shadow-blue-900/40"
        >
          {isParsing ? (
            <>
              <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              Architecting Session...
            </>
          ) : (
            <>
              Generate Interview Experience
              <CheckCircle2 className="w-6 h-6 opacity-60" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default InterviewSetup;
