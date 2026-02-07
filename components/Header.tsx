
import React from 'react';
import { Bell, Mic2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const Header: React.FC = () => {
  const { user } = useAuthStore();
  const initial = (user?.fullName || 'U').charAt(0).toUpperCase();
  const remaining = user ? 5 - user.interviewsThisWeek : 0;
  const isAdmin = user?.role === 'admin';

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-8 flex items-center justify-end sticky top-0 z-10">
      <div className="flex items-center gap-6">
        {/* Interview limit badge (non-admin only) */}
        {!isAdmin && (
          <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-1.5">
            <Mic2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-bold text-slate-300">
              {remaining > 0 ? `${remaining}/5 left` : 'Limit reached'}
            </span>
          </div>
        )}
        {isAdmin && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5">
            <span className="text-xs font-bold text-amber-400">Admin</span>
          </div>
        )}
        <button className="relative text-slate-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <button className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold hover:opacity-90 transition-opacity">
          {initial}
        </button>
      </div>
    </header>
  );
};

export default Header;
