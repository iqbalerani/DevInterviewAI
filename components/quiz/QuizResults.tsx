import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, RotateCcw, ArrowLeft } from 'lucide-react';
import { QuizDeck, QuizProgress } from '../../types';

interface QuizResultsProps {
  deck: QuizDeck;
  progress: QuizProgress;
  onRetry: () => void;
  onBack: () => void;
}

const QuizResults: React.FC<QuizResultsProps> = ({ deck, progress, onRetry, onBack }) => {
  const total = deck.questions.length;
  const correct = Object.values(progress.answers).filter((a) => a.status === 'correct').length;
  const percent = Math.round((correct / total) * 100);

  const byDifficulty = (diff: string) => {
    const qs = deck.questions.filter((q) => q.difficulty === diff);
    const c = qs.filter((q) => progress.answers[q.id]?.status === 'correct').length;
    return { total: qs.length, correct: c };
  };

  const beginner = byDifficulty('beginner');
  const intermediate = byDifficulty('intermediate');
  const advanced = byDifficulty('advanced');

  const getMessage = () => {
    if (percent >= 90) return 'Outstanding! You crushed it!';
    if (percent >= 70) return 'Great job! Solid understanding.';
    if (percent >= 50) return 'Good effort! Room to improve.';
    return 'Keep studying, you\'ll get there!';
  };

  const getColor = () => {
    if (percent >= 90) return 'text-green-400';
    if (percent >= 70) return 'text-blue-400';
    if (percent >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-lg mx-auto space-y-8"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto">
          <Trophy className={`w-8 h-8 ${getColor()}`} />
        </div>

        <div>
          <p className={`text-5xl font-bold ${getColor()}`}>{correct}/{total}</p>
          <p className="text-slate-400 mt-1 text-sm">{percent}% correct</p>
        </div>

        <p className="text-lg font-medium text-slate-200">{getMessage()}</p>

        {/* Difficulty breakdown */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800">
          {[
            { label: 'Beginner', data: beginner, color: 'text-green-400' },
            { label: 'Intermediate', data: intermediate, color: 'text-yellow-400' },
            { label: 'Advanced', data: advanced, color: 'text-red-400' },
          ].map((d) => (
            <div key={d.label} className="text-center">
              <p className={`text-lg font-bold ${d.color}`}>{d.data.correct}/{d.data.total}</p>
              <p className="text-xs text-slate-500">{d.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Quizzes
        </button>
        <button
          onClick={onRetry}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
        >
          <RotateCcw className="w-4 h-4" />
          Retry Quiz
        </button>
      </div>
    </motion.div>
  );
};

export default QuizResults;
