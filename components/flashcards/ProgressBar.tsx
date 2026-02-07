import React from 'react';

interface ProgressBarProps {
  mastered: number;
  total: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ mastered, total }) => {
  const percent = total === 0 ? 0 : Math.round((mastered / total) * 100);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
        {mastered}/{total}
      </span>
    </div>
  );
};

export default ProgressBar;
