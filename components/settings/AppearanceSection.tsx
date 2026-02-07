import React from 'react';
import { Palette, Moon, Monitor } from 'lucide-react';
import { UserSettings } from '../../types';

const ACCENT_COLORS = [
  { name: 'blue', class: 'bg-blue-600' },
  { name: 'purple', class: 'bg-purple-600' },
  { name: 'green', class: 'bg-green-600' },
  { name: 'orange', class: 'bg-orange-500' },
  { name: 'rose', class: 'bg-rose-600' },
];

interface AppearanceSectionProps {
  settings: UserSettings;
  onUpdate: (updates: Partial<UserSettings>) => void;
}

const AppearanceSection: React.FC<AppearanceSectionProps> = ({ settings, onUpdate }) => {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Palette className="w-5 h-5 text-blue-400" />
        <h3 className="text-xl font-bold text-slate-100">Appearance</h3>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">Theme</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onUpdate({ theme: 'dark' })}
            className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
              settings.theme === 'dark'
                ? 'border-blue-500 bg-slate-900'
                : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
            }`}
          >
            <Moon className="w-5 h-5 text-slate-300" />
            <div className="text-left">
              <p className="text-sm font-medium text-slate-200">Dark</p>
              <p className="text-xs text-slate-500">Always dark theme</p>
            </div>
          </button>
          <button
            onClick={() => onUpdate({ theme: 'system' })}
            className={`relative flex items-center gap-3 p-4 rounded-xl border transition-all ${
              settings.theme === 'system'
                ? 'border-blue-500 bg-slate-900'
                : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
            }`}
          >
            <Monitor className="w-5 h-5 text-slate-300" />
            <div className="text-left">
              <p className="text-sm font-medium text-slate-200">System</p>
              <p className="text-xs text-slate-500">Match OS preference</p>
            </div>
            <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded-full">
              Soon
            </span>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">Accent Color</label>
        <div className="flex gap-3">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c.name}
              onClick={() => onUpdate({ accentColor: c.name })}
              className={`w-10 h-10 rounded-full ${c.class} transition-all ${
                settings.accentColor === c.name
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800'
                  : 'hover:scale-110'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-2">Accent color customization coming soon</p>
      </div>
    </div>
  );
};

export default AppearanceSection;
