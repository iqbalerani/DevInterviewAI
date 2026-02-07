
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Star, Shield, ExternalLink, Download, Loader2 } from 'lucide-react';
import { interviewService } from '../services/interviewService';
import { generateCertificatePDF, CertificateData } from '../services/certificateGenerator';

interface Certificate {
  sessionId: string;
  jobDescription: string;
  overallScore: number;
  scores: { technical: number; coding: number; communication: number; problemSolving: number };
  strengths: string[];
  date: string;
  candidateName: string;
}

function getLevel(score: number) {
  if (score >= 90) return { label: 'Expert', color: 'bg-green-500' };
  if (score >= 75) return { label: 'Advanced', color: 'bg-purple-500' };
  return { label: 'Intermediate', color: 'bg-amber-500' };
}

const Certificates: React.FC = () => {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    interviewService.getCertificates()
      .then(setCertificates)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = (cert: Certificate) => {
    const data: CertificateData = {
      candidateName: cert.candidateName,
      sessionId: cert.sessionId,
      date: new Date(cert.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      overallScore: cert.overallScore,
      scores: cert.scores,
      strengths: cert.strengths,
      jobTitle: cert.jobDescription
    };
    generateCertificatePDF(data);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const truncate = (text: string, max: number) =>
    text.length > max ? text.substring(0, max - 3) + '...' : text;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Verified Credentials</h2>
          <p className="text-slate-400 mt-1">Proof of your skills verified by the AI interviewer.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-slate-400">Loading certificates...</p>
        </div>
      ) : error ? (
        <div className="text-center py-24">
          <p className="text-red-400">Failed to load certificates: {error}</p>
        </div>
      ) : certificates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center">
            <Award className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-300">No Certificates Yet</h3>
          <p className="text-slate-500 max-w-md text-center">
            Complete an interview with an overall score above 50% to earn your first verified certificate.
          </p>
          <button
            onClick={() => navigate('/interview/setup')}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all"
          >
            Start an Interview
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {certificates.map(cert => {
            const { label, color } = getLevel(cert.overallScore);
            return (
              <div key={cert.sessionId} className="bg-slate-900 border border-slate-800 rounded-3xl p-8 group hover:border-blue-500/50 transition-all relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-24 h-24 ${color} opacity-10 blur-3xl`} />
                <div className={`w-16 h-16 ${color}/20 text-white rounded-2xl flex items-center justify-center mb-6`}>
                  <Award className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold group-hover:text-blue-400 transition-colors">
                    {truncate(cert.jobDescription, 50)}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 uppercase tracking-widest">{formatDate(cert.date)}</span>
                    <span className={`px-2 py-0.5 rounded-full ${color}/20 text-[10px] font-bold text-slate-300`}>{label}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-2xl font-black text-white">{cert.overallScore}%</span>
                    <span className="text-xs text-slate-500">overall</span>
                  </div>
                </div>
                <div className="mt-8 pt-8 border-t border-slate-800 flex gap-4">
                  <button
                    onClick={() => handleDownload(cert)}
                    className="flex-1 flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    onClick={() => navigate(`/interview/results/${cert.sessionId}`)}
                    className="flex-1 flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Verify
                  </button>
                </div>
              </div>
            );
          })}

          <div className="border-2 border-dashed border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4 opacity-50 hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 rounded-full border border-slate-700 flex items-center justify-center">
              <Star className="w-6 h-6 text-slate-500" />
            </div>
            <div>
              <p className="font-bold">Next Milestone</p>
              <p className="text-sm text-slate-500">Complete another interview to earn your next certificate.</p>
            </div>
          </div>
        </div>
      )}

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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Certificates;
