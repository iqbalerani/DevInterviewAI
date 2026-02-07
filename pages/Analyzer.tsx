
import React, { useState } from 'react';
import { FileText, Search, ShieldCheck, Zap, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { interviewService } from '../services/interviewService';

const Analyzer: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [resume, setResume] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSavedResume, setLoadingSavedResume] = useState(false);

  const handleUseSavedResume = async () => {
    setLoadingSavedResume(true);
    try {
      const { extractedText } = await interviewService.getSavedResumeText();
      setResume(extractedText);
    } catch (err) {
      console.error('Failed to load saved resume:', err);
    } finally {
      setLoadingSavedResume(false);
    }
  };

  const handleAnalyze = async () => {
    if (!resume) return;
    setLoading(true);
    try {
      const result = await interviewService.analyzeResume(resume);
      setAnalysis(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Resume Skill Analyzer</h2>
          <p className="text-slate-400 mt-1">Get instant feedback on your market readiness and skill gaps.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 text-blue-500 rounded-full border border-blue-500/20 text-xs font-bold uppercase tracking-widest">
          <ShieldCheck className="w-4 h-4" />
          AI Privacy Shield Active
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          {user?.resume && (
            <button
              onClick={handleUseSavedResume}
              disabled={loadingSavedResume}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-blue-600/10 text-blue-400 rounded-xl hover:bg-blue-600/20 transition-all border border-blue-500/20 disabled:opacity-50"
            >
              {loadingSavedResume ? (
                <div className="w-3.5 h-3.5 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
              Use Saved Resume ({user.resume.fileName})
            </button>
          )}
          <textarea
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            placeholder="Paste your resume text here for a deep-dive analysis..."
            className="w-full h-[500px] bg-slate-900 border border-slate-800 rounded-3xl p-6 text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-mono text-sm leading-relaxed"
          />
          <button
            onClick={handleAnalyze}
            disabled={!resume || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-500/20"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Search className="w-5 h-5" />
                Analyze Skills & Seniority
              </>
            )}
          </button>
        </div>

        <div className="space-y-8">
          {analysis ? (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700">
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Estimated Seniority</p>
                <h3 className="text-3xl font-black text-blue-400 capitalize">{analysis.seniorityEstimate}</h3>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="bg-green-500/5 p-6 rounded-3xl border border-green-500/20">
                  <h4 className="flex items-center gap-2 text-green-500 font-bold mb-4">
                    <Zap className="w-4 h-4" />
                    Market Strengths
                  </h4>
                  <ul className="space-y-2">
                    {analysis.strengths.map((s: string, i: number) => (
                      <li key={i} className="text-sm text-slate-300 flex gap-2">
                        <span className="text-green-500">•</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-orange-500/5 p-6 rounded-3xl border border-orange-500/20">
                  <h4 className="flex items-center gap-2 text-orange-500 font-bold mb-4">
                    <AlertCircle className="w-4 h-4" />
                    Skill Gaps
                  </h4>
                  <ul className="space-y-2">
                    {analysis.gaps.map((g: string, i: number) => (
                      <li key={i} className="text-sm text-slate-300 flex gap-2">
                        <span className="text-orange-500">•</span> {g}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bg-blue-500/5 p-6 rounded-3xl border border-blue-500/20">
                <h4 className="text-blue-500 font-bold mb-4">Growth Suggestions</h4>
                <div className="space-y-4">
                  {analysis.suggestions.map((s: string, i: number) => (
                    <div key={i} className="p-3 bg-slate-900/50 rounded-xl border border-slate-800 text-sm text-slate-400">
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[600px] border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-600 p-8 text-center">
              <FileText className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg">Paste your resume to see the AI analysis here.</p>
              <p className="text-sm mt-2">We analyze technical breadth, depth, and seniority alignment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analyzer;
