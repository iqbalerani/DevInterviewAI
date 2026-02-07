import React, { useState } from 'react';
import { Shield, Download, Trash2, RotateCcw } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface DataPrivacySectionProps {
  onReset: () => void;
}

const DataPrivacySection: React.FC<DataPrivacySectionProps> = ({ onReset }) => {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? 'anonymous';
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleExport = () => {
    const data: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        data[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devproof-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearHistory = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    const settingsKey = `devproof-user-settings-${userId}`;
    const flashcardKey = `devproof-flashcard-progress-${userId}`;
    const settingsBackup = localStorage.getItem(settingsKey);
    const flashcardBackup = localStorage.getItem(flashcardKey);
    localStorage.clear();
    if (settingsBackup) localStorage.setItem(settingsKey, settingsBackup);
    if (flashcardBackup) localStorage.setItem(flashcardKey, flashcardBackup);
    setConfirmClear(false);
  };

  const handleResetAll = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    onReset();
    setConfirmReset(false);
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 text-blue-400" />
        <h3 className="text-xl font-bold text-slate-100">Data & Privacy</h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-200">Export Interview Data</p>
            <p className="text-xs text-slate-500">Download all your data as JSON</p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <div className="border-t border-red-500/20 pt-6 space-y-4">
        <p className="text-sm font-medium text-red-400">Danger Zone</p>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-200">Clear Interview History</p>
            <p className="text-xs text-slate-500">Remove all interview sessions and transcripts</p>
          </div>
          <button
            onClick={handleClearHistory}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
              confirmClear
                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                : 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            {confirmClear ? 'Click again to confirm' : 'Clear History'}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-200">Reset All Settings</p>
            <p className="text-xs text-slate-500">Revert all preferences to defaults</p>
          </div>
          <button
            onClick={handleResetAll}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
              confirmReset
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            {confirmReset ? 'Click again to confirm' : 'Reset All'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataPrivacySection;
