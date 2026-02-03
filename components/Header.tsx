
import React from 'react';
import { Bell, Search, User } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-8 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center bg-slate-800 rounded-full px-4 py-1.5 w-96">
        <Search className="w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search interviews, topics..." 
          className="bg-transparent border-none focus:outline-none text-sm ml-2 w-full text-slate-200"
        />
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-400">Streak</span>
            <span className="text-sm font-bold text-orange-400">🔥 12 Days</span>
          </div>
        </div>
        <button className="relative text-slate-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <button className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700 transition-colors">
          <User className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Header;
