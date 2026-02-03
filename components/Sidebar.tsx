
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Mic2, FileText, Settings, Award } from 'lucide-react';

const Sidebar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Mic2, label: 'Interviews', path: '/interview/setup' },
    { icon: FileText, label: 'Resume Analyzer', path: '/analyzer' },
    { icon: Award, label: 'Certificates', path: '/certificates' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col hidden md:flex">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-blue-500 flex items-center gap-2">
          <Award className="w-8 h-8" />
          DevProof
        </h1>
      </div>
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-slate-700"></div>
          <div>
            <p className="text-sm font-medium text-slate-200">John Developer</p>
            <p className="text-xs">Pro Member</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
