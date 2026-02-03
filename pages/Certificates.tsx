
import React from 'react';
import { Award, Star, Shield, ExternalLink, Download } from 'lucide-react';

const Certificates: React.FC = () => {
  const badges = [
    { name: 'TypeScript Architect', date: 'Oct 24, 2024', level: 'Expert', color: 'bg-blue-500' },
    { name: 'System Design Master', date: 'Sep 12, 2024', level: 'Advanced', color: 'bg-purple-500' },
    { name: 'Clean Code Advocate', date: 'Aug 05, 2024', level: 'Intermediate', color: 'bg-green-500' },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Verified Credentials</h2>
          <p className="text-slate-400 mt-1">Proof of your skills verified by the AI interviewer.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all">
          Link to LinkedIn
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {badges.map((badge, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-3xl p-8 group hover:border-blue-500/50 transition-all cursor-pointer relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-24 h-24 ${badge.color} opacity-10 blur-3xl`} />
            <div className={`w-16 h-16 ${badge.color}/20 text-white rounded-2xl flex items-center justify-center mb-6`}>
              <Award className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold group-hover:text-blue-400 transition-colors">{badge.name}</h3>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 uppercase tracking-widest">{badge.date}</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-300">{badge.level}</span>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-slate-800 flex gap-4">
              <button className="flex-1 flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">
                <Download className="w-4 h-4" />
                Download
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">
                <ExternalLink className="w-4 h-4" />
                Verify
              </button>
            </div>
          </div>
        ))}
        
        <div className="border-2 border-dashed border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4 opacity-50 hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full border border-slate-700 flex items-center justify-center">
            <Star className="w-6 h-6 text-slate-500" />
          </div>
          <div>
            <p className="font-bold">Next Milestone</p>
            <p className="text-sm text-slate-500">Complete a 'Senior Frontend' interview to unlock the next badge.</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-12 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
          <Shield className="w-96 h-96" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-6">
          <h3 className="text-4xl font-black text-white">Share Your Success</h3>
          <p className="text-blue-100 text-lg">
            Our certificates are recognized by 50+ partner tech companies as a valid measure of technical capability. Add them to your portfolio today.
          </p>
          <div className="flex gap-4">
            <button className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-blue-50 transition-all transform hover:scale-105">
              Public Profile Link
            </button>
            <button className="bg-blue-500 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-blue-400 transition-all border border-blue-400">
              Download All (PDF)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Certificates;
