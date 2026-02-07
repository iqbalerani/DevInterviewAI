import React, { useState } from 'react';
import { Mic2 } from 'lucide-react';
import { UserSettings } from '../../types';

const LANGUAGES = ['Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'Go', 'Rust'];
const DURATIONS = [
  { value: 120, label: '2 min' },
  { value: 180, label: '3 min' },
  { value: 300, label: '5 min' },
];
const DIFFICULTIES: Array<{ value: UserSettings['defaultDifficulty']; label: string }> = [
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid' },
  { value: 'senior', label: 'Senior' },
];

interface InterviewPrefsSectionProps {
  settings: UserSettings;
  onUpdate: (updates: Partial<UserSettings>) => void;
}

const InterviewPrefsSection: React.FC<InterviewPrefsSectionProps> = ({ settings, onUpdate }) => {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const selectClass =
    'bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all w-full appearance-none cursor-pointer';

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Mic2 className="w-5 h-5 text-blue-400" />
        <h3 className="text-xl font-bold text-slate-100">Interview Preferences</h3>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Default Difficulty</label>
        <div className="flex rounded-xl overflow-hidden border border-slate-700">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              onClick={() => onUpdate({ defaultDifficulty: d.value })}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                settings.defaultDifficulty === d.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Session Duration
          </label>
          <select
            value={settings.sessionDuration}
            onChange={(e) => onUpdate({ sessionDuration: Number(e.target.value) })}
            className={selectClass}
          >
            {DURATIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Preferred Coding Language
          </label>
          <select
            value={settings.preferredLanguage}
            onChange={(e) => onUpdate({ preferredLanguage: e.target.value })}
            className={selectClass}
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          Save Preferences
        </button>
        {saved && <span className="text-sm text-green-400 animate-pulse">Saved!</span>}
      </div>
    </div>
  );
};

export default InterviewPrefsSection;
