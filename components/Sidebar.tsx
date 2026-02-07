
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Mic2, FileText, Layers, CircleHelp, Settings, Award, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();

  const displayName = user?.fullName || 'User';
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Mic2, label: 'Interviews', path: '/interview/setup' },
    { icon: FileText, label: 'Resume Analyzer', path: '/analyzer' },
    { icon: Layers, label: 'Flashcards', path: '/flashcards' },
    { icon: CircleHelp, label: 'Quizzes', path: '/quiz' },
    { icon: Award, label: 'Certificates', path: '/certificates' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const handleLogout = () => {
    clearAuth();
    navigate('/');
  };

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
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/settings" className="flex items-center gap-3 text-slate-400 hover:text-white cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {initials || 'JD'}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">{displayName}</p>
              <p className="text-xs">{user?.role === 'admin' ? 'Admin' : 'Pro Member'}</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="text-slate-500 hover:text-red-400 transition-colors p-1"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
