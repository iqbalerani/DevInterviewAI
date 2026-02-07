import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { QuizQuestion, QuizAnswerStatus } from '../../types';

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
  intermediate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  advanced: 'bg-red-500/20 text-red-400 border-red-500/30',
};

interface QuestionCardProps {
  question: QuizQuestion;
  selectedOptionId: string | null;
  status: QuizAnswerStatus;
  onAnswer: (optionId: string) => void;
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const optionVariants = {
  hidden: { opacity: 0, x: -16 },
  show: { opacity: 1, x: 0 },
};

const QuestionCard: React.FC<QuestionCardProps> = ({ question, selectedOptionId, status, onAnswer }) => {
  const [shaking, setShaking] = useState(false);
  const answered = status !== 'unanswered';

  const handleClick = (optionId: string) => {
    if (answered) return;
    onAnswer(optionId);
    if (optionId !== question.correctOptionId) {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
  };

  const getOptionStyle = (optionId: string) => {
    if (!answered) {
      return 'bg-slate-800 border-slate-700 hover:border-slate-500 hover:bg-slate-700/50 cursor-pointer';
    }
    if (optionId === question.correctOptionId) {
      return 'bg-green-500/10 border-green-500/40 text-green-300';
    }
    if (optionId === selectedOptionId && optionId !== question.correctOptionId) {
      return 'bg-red-500/10 border-red-500/40 text-red-300';
    }
    return 'bg-slate-800/50 border-slate-700/50 text-slate-500';
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Difficulty badge */}
      <div>
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${difficultyColors[question.difficulty]}`}>
          {question.difficulty}
        </span>
      </div>

      {/* Question text */}
      <p className="text-lg font-semibold text-slate-100 leading-relaxed">{question.question}</p>

      {/* Code snippet */}
      {question.codeSnippet && (
        <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">
          {question.codeSnippet}
        </pre>
      )}

      {/* Options */}
      <motion.div
        className="space-y-3"
        variants={containerVariants}
        initial="hidden"
        animate="show"
        key={question.id}
      >
        {question.options.map((option) => {
          const isSelected = option.id === selectedOptionId;
          const isCorrect = option.id === question.correctOptionId;

          return (
            <motion.button
              key={option.id}
              variants={optionVariants}
              onClick={() => handleClick(option.id)}
              disabled={answered}
              animate={
                answered && isSelected && !isCorrect && shaking
                  ? { x: [0, -8, 8, -8, 8, 0] }
                  : answered && isCorrect
                  ? { scale: [1, 1.02, 1] }
                  : {}
              }
              transition={{ duration: 0.4 }}
              className={`w-full text-left px-5 py-4 rounded-2xl border text-sm font-medium transition-colors flex items-center gap-3 ${getOptionStyle(option.id)}`}
            >
              <span className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${
                answered && isCorrect
                  ? 'border-green-500 bg-green-500/20 text-green-400'
                  : answered && isSelected && !isCorrect
                  ? 'border-red-500 bg-red-500/20 text-red-400'
                  : 'border-slate-600 text-slate-400'
              }`}>
                {String.fromCharCode(65 + question.options.indexOf(option))}
              </span>
              <span>{option.text}</span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Explanation */}
      {answered && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className={`p-5 rounded-2xl border ${
            status === 'correct'
              ? 'bg-green-500/5 border-green-500/20'
              : 'bg-red-500/5 border-red-500/20'
          }`}
        >
          <p className={`text-sm font-semibold mb-1 ${status === 'correct' ? 'text-green-400' : 'text-red-400'}`}>
            {status === 'correct' ? 'Correct!' : 'Incorrect'}
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">{question.explanation}</p>
        </motion.div>
      )}
    </div>
  );
};

export default QuestionCard;
