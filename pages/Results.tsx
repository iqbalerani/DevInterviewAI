
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Award, Share2, Download, CheckCircle2, AlertCircle, RefreshCcw, Home } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { useAppStore } from '../store';
import { geminiService } from '../services/geminiService';

const Results: React.FC = () => {
  const { sessionId } = useParams();
  const { session, resetSession } = useAppStore();
  const [evaluation, setEvaluation] = useState<any>(null);
  const [chartUrl, setChartUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const processResults = async () => {
      if (!session) return;
      
      try {
        const result = await geminiService.evaluateInterview(session);
        setEvaluation(result);
        const url = await geminiService.generateSkillChart(result);
        setChartUrl(url);
      } catch (e) {
        console.error("Evaluation failed", e);
      } finally {
        setIsLoading(false);
      }
    };

    processResults();
  }, [session]);

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

  const radarData = [
    { subject: 'Technical', A: evaluation.technical, fullMark: 100 },
    { subject: 'Coding', A: evaluation.coding, fullMark: 100 },
    { subject: 'Communication', A: evaluation.communication, fullMark: 100 },
    { subject: 'Logic', A: evaluation.problemSolving, fullMark: 100 },
  ];

  const overallScore = Math.round((evaluation.technical + evaluation.coding + evaluation.communication + evaluation.problemSolving) / 4);

  return (
    <div className="max-w-6xl mx-auto p-8 pb-20 space-y-12 animate-in fade-in duration-1000">
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
          <button className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all">
            <Share2 className="w-5 h-5" />
            Share Report
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20">
            <Download className="w-5 h-5" />
            Download Certificate
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Main Score & Charts */}
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
                <h4 className="text-2xl font-bold">{overallScore >= 80 ? 'Strong Hire' : 'Developing'}</h4>
                <p className="text-slate-400">Based on industry standards for {session?.questions[0].difficulty} level.</p>
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

          {/* Feedback Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
          </div>
        </div>

        {/* Sidebar: Recommendations & Visuals */}
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
              {[
                { title: 'System Design Fundamentals', platform: 'Coursera', time: '12h' },
                { title: 'Advanced React Patterns', platform: 'Frontend Masters', time: '8h' },
                { title: 'Database Indexing Deep-dive', platform: 'Udemy', time: '5h' },
              ].map((course, i) => (
                <div key={i} className="group cursor-pointer">
                  <p className="font-bold text-slate-200 group-hover:text-blue-400 transition-colors">{course.title}</p>
                  <p className="text-xs text-slate-500">{course.platform} • {course.time}</p>
                </div>
              ))}
            </div>
            <button className="w-full mt-8 py-3 rounded-xl border border-slate-700 hover:border-slate-500 font-bold transition-all">
              View All Recommendations
            </button>
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
    </div>
  );
};

export default Results;
