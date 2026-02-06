
import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Play, TrendingUp, Clock, Target, Plus, RefreshCcw, ArrowRight } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { interviewService } from '../services/interviewService';
import type { DashboardStats, DashboardSession } from '../types';

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function extractRole(jd: string): string {
  if (!jd) return 'Interview';
  const firstLine = jd.split('\n')[0].trim();
  return firstLine.length > 40 ? firstLine.slice(0, 40) + '...' : firstLine || 'Interview';
}

function getSessionAvgScore(evaluation: DashboardSession['evaluation']): number | null {
  if (!evaluation?.scores) return null;
  const s = evaluation.scores;
  return Math.round(((s.technical || 0) + (s.coding || 0) + (s.communication || 0) + (s.problemSolving || 0)) / 4);
}

function formatDuration(startTime?: string, endTime?: string): string {
  if (!startTime || !endTime) return '--';
  const seconds = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000);
  if (seconds < 0) return '--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

type TimeRange = '7d' | '30d' | 'all';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await interviewService.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const chartData = useMemo(() => {
    if (!stats) return [];
    let points = stats.skillProgression;
    if (timeRange !== 'all') {
      const cutoff = Date.now() - (timeRange === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000;
      points = points.filter(p => new Date(p.date).getTime() >= cutoff);
    }
    return points.map(p => ({
      name: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: p.overallScore
    }));
  }, [stats, timeRange]);

  // --- Loading skeleton ---
  if (loading) {
    return (
      <div className="space-y-8 p-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-64 bg-slate-700/50 rounded-lg animate-pulse" />
            <div className="h-4 w-80 bg-slate-700/30 rounded mt-2 animate-pulse" />
          </div>
          <div className="h-12 w-44 bg-slate-700/50 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl animate-pulse">
              <div className="h-8 w-8 bg-slate-700/50 rounded mb-4" />
              <div className="h-8 w-20 bg-slate-700/50 rounded mb-1" />
              <div className="h-4 w-28 bg-slate-700/30 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <div className="h-64 bg-slate-700/30 rounded animate-pulse" />
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <div className="h-64 bg-slate-700/30 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // --- Error state ---
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="text-red-400 text-lg mb-4">{error}</div>
        <button onClick={fetchStats} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all">
          <RefreshCcw className="w-5 h-5" /> Retry
        </button>
      </div>
    );
  }

  // --- Empty state ---
  if (!stats || stats.totalCompleted === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 animate-in fade-in duration-500">
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-12 text-center max-w-lg">
          <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Play className="w-8 h-8 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Welcome to DevProof!</h2>
          <p className="text-slate-400 mb-8">Complete your first AI-powered interview to see your dashboard stats, skill progression, and interview history.</p>
          <Link to="/interview/setup" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold inline-flex items-center gap-2 transition-all transform hover:scale-105 shadow-lg shadow-blue-500/20">
            <Plus className="w-5 h-5" /> Start Your First Interview
          </Link>
        </div>
      </div>
    );
  }

  // --- Data state ---
  const recentActivity = stats.recentSessions.slice(0, 3);

  return (
    <div className="space-y-8 p-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Dashboard</h2>
          <p className="text-slate-400 mt-1">{stats.totalCompleted} interview{stats.totalCompleted !== 1 ? 's' : ''} completed</p>
        </div>
        <Link to="/interview/setup" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all transform hover:scale-105 shadow-lg shadow-blue-500/20">
          <Plus className="w-5 h-5" />
          Start New Practice
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Overall Score', value: `${Math.round(stats.averageScore)}%`, icon: Target, color: 'text-blue-500' },
          { label: 'Interviews Done', value: String(stats.totalCompleted), icon: Play, color: 'text-green-500' },
          { label: 'Avg. Duration', value: `${stats.averageDuration}s`, icon: Clock, color: 'text-purple-500' },
          { label: 'Skill Growth', value: `${stats.skillGrowth >= 0 ? '+' : ''}${stats.skillGrowth}%`, icon: TrendingUp, color: 'text-orange-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl hover:border-slate-500 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
            </div>
            <p className="text-3xl font-bold">{stat.value}</p>
            <p className="text-sm text-slate-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Chart + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold">Skill Progression</h3>
            <select
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none"
              value={timeRange}
              onChange={e => setTimeRange(e.target.value as TimeRange)}
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
          <div className="h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                No data for this time range
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col">
          <h3 className="text-xl font-bold mb-6">Recent Activity</h3>
          <div className="space-y-6 flex-1">
            {recentActivity.map((session) => {
              const score = getSessionAvgScore(session.evaluation);
              return (
                <Link key={session.id} to={`/interview/results/${session.id}`} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      score !== null && score > 80 ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-500'
                    }`}>
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-200 group-hover:text-blue-400 transition-colors">{extractRole(session.jobDescription)}</p>
                      <p className="text-xs text-slate-500">{formatRelativeTime(session.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {score !== null ? (
                      <>
                        <span className={`text-lg font-bold ${score >= 80 ? 'text-green-400' : 'text-blue-400'}`}>{score}</span>
                        <span className="text-xs text-slate-500 ml-1">/100</span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-500">Pending</span>
                    )}
                  </div>
                </Link>
              );
            })}
            {recentActivity.length === 0 && (
              <p className="text-slate-500 text-sm">No recent interviews</p>
            )}
          </div>
        </div>
      </div>

      {/* Interview History Table */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
        <h3 className="text-xl font-bold mb-6">Interview History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-sm">
                <th className="pb-3 pr-4 font-medium">Date</th>
                <th className="pb-3 pr-4 font-medium">Role</th>
                <th className="pb-3 pr-4 font-medium">Duration</th>
                <th className="pb-3 pr-4 font-medium">Score</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentSessions.map(session => {
                const score = getSessionAvgScore(session.evaluation);
                return (
                  <tr key={session.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                    <td className="py-4 pr-4 text-sm text-slate-300">
                      {new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-4 pr-4 text-sm font-medium text-slate-200">
                      {extractRole(session.jobDescription)}
                    </td>
                    <td className="py-4 pr-4 text-sm text-slate-400">
                      {formatDuration(session.startTime, session.endTime)}
                    </td>
                    <td className="py-4 pr-4 text-sm">
                      {score !== null ? (
                        <span className={`font-bold ${
                          score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {score}/100
                        </span>
                      ) : (
                        <span className="text-slate-500">--</span>
                      )}
                    </td>
                    <td className="py-4 pr-4 text-sm">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        session.status === 'completed'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : session.status === 'active'
                          ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                          : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                      }`}>
                        {session.status === 'completed' ? 'Completed' : session.status === 'active' ? 'In Progress' : session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-4 text-sm">
                      {session.status === 'completed' ? (
                        <Link to={`/interview/results/${session.id}`} className="text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1 transition-colors">
                          View Results <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <span className="text-slate-600">--</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {stats.recentSessions.length === 0 && (
            <div className="text-center text-slate-500 py-8 text-sm">No interviews yet</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
