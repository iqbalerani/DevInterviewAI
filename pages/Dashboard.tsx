
import React from 'react';
import { Link } from 'react-router-dom';
import { Play, TrendingUp, Clock, Target, Plus } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

const data = [
  { name: 'Mon', score: 65 },
  { name: 'Tue', score: 68 },
  { name: 'Wed', score: 72 },
  { name: 'Thu', score: 70 },
  { name: 'Fri', score: 85 },
  { name: 'Sat', score: 82 },
  { name: 'Sun', score: 90 },
];

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8 p-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Welcome back, John!</h2>
          <p className="text-slate-400 mt-1">Your technical skills are looking sharp today.</p>
        </div>
        <Link to="/interview/setup" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all transform hover:scale-105 shadow-lg shadow-blue-500/20">
          <Plus className="w-5 h-5" />
          Start New Practice
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Overall Score', value: '82%', icon: Target, color: 'text-blue-500' },
          { label: 'Interviews Done', value: '24', icon: Play, color: 'text-green-500' },
          { label: 'Avg. Response Time', value: '45s', icon: Clock, color: 'text-purple-500' },
          { label: 'Skill Growth', value: '+12%', icon: TrendingUp, color: 'text-orange-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl hover:border-slate-500 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">vs Last Month</span>
            </div>
            <p className="text-3xl font-bold">{stat.value}</p>
            <p className="text-sm text-slate-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold">Skill Progression</h3>
            <select className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
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
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col">
          <h3 className="text-xl font-bold mb-6">Recent Activity</h3>
          <div className="space-y-6 flex-1">
            {[
              { type: 'Technical', role: 'Full Stack Dev', date: '2h ago', score: 92 },
              { type: 'Behavioral', role: 'Team Lead', date: 'Yesterday', score: 78 },
              { type: 'Coding', role: 'Backend Engineer', date: '3 days ago', score: 85 },
            ].map((activity, i) => (
              <div key={i} className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    activity.score > 90 ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-500'
                  }`}>
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-200 group-hover:text-blue-400 transition-colors">{activity.type} Interview</p>
                    <p className="text-xs text-slate-500">{activity.role} • {activity.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold">{activity.score}</span>
                  <span className="text-xs text-slate-500 ml-1">/100</span>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-8 text-blue-500 text-sm font-bold hover:text-blue-400 transition-colors flex items-center justify-center gap-2">
            View All History
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
