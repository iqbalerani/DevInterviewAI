import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, ChevronLeft } from 'lucide-react';
import { QuizDeck, QuizProgress, QuizAnswerStatus } from '../../types';
import QuestionCard from './QuestionCard';
import QuizResults from './QuizResults';
import ProgressBar from '../flashcards/ProgressBar';

interface QuizSessionProps {
  deck: QuizDeck;
  progress: QuizProgress;
  onUpdateProgress: (progress: QuizProgress) => void;
  onBack: () => void;
}

const QuizSession: React.FC<QuizSessionProps> = ({ deck, progress, onUpdateProgress, onBack }) => {
  const [currentIndex, setCurrentIndex] = useState(progress.currentIndex);
  const [direction, setDirection] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const question = deck.questions[currentIndex];
  const answer = progress.answers[question.id] || { selectedOptionId: null, status: 'unanswered' as QuizAnswerStatus };
  const correctCount = Object.values(progress.answers).filter((a) => a.status === 'correct').length;
  const answeredCount = Object.values(progress.answers).filter((a) => a.status !== 'unanswered').length;
  const allAnswered = answeredCount === deck.questions.length;

  const goTo = useCallback((index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  }, [currentIndex]);

  const goNext = useCallback(() => {
    if (currentIndex < deck.questions.length - 1) goTo(currentIndex + 1);
  }, [currentIndex, deck.questions.length, goTo]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) goTo(currentIndex - 1);
  }, [currentIndex, goTo]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showResults) return;
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, showResults]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (showResults) return;
    if (info.offset.x < -80) goNext();
    else if (info.offset.x > 80) goPrev();
  };

  const handleAnswer = (optionId: string) => {
    const isCorrect = optionId === question.correctOptionId;
    const updated: QuizProgress = {
      ...progress,
      answers: {
        ...progress.answers,
        [question.id]: { selectedOptionId: optionId, status: isCorrect ? 'correct' : 'incorrect' },
      },
      lastAttemptedAt: Date.now(),
      currentIndex,
    };
    // Check if all answered after this one
    const newAnsweredCount = Object.values(updated.answers).filter((a) => a.status !== 'unanswered').length;
    if (newAnsweredCount === deck.questions.length) {
      updated.completedAt = Date.now();
    }
    onUpdateProgress(updated);
  };

  const handleRetry = () => {
    const reset: QuizProgress = {
      deckId: deck.id,
      answers: {},
      lastAttemptedAt: Date.now(),
      currentIndex: 0,
    };
    onUpdateProgress(reset);
    setCurrentIndex(0);
    setShowResults(false);
  };

  if (showResults) {
    return <QuizResults deck={deck} progress={progress} onRetry={handleRetry} onBack={onBack} />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="font-medium">Back to Quizzes</span>
        </button>
        <div className="text-sm text-slate-400 font-medium">
          {currentIndex + 1} / {deck.questions.length}
        </div>
      </div>

      {/* Deck title + progress */}
      <div>
        <h2 className="text-2xl font-bold text-slate-100">{deck.title}</h2>
        <div className="mt-2 max-w-xs">
          <ProgressBar mastered={correctCount} total={deck.questions.length} />
        </div>
      </div>

      {/* Question area */}
      <div className="flex flex-col items-center gap-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={question.id}
            initial={{ opacity: 0, x: direction * 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -100 }}
            transition={{ duration: 0.25 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            className="w-full"
          >
            <QuestionCard
              question={question}
              selectedOptionId={answer.selectedOptionId}
              status={answer.status}
              onAnswer={handleAnswer}
            />
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center gap-4">
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="p-3 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {allAnswered ? (
            <button
              onClick={() => setShowResults(true)}
              className="px-6 py-2.5 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              View Results
            </button>
          ) : (
            <span className="text-sm text-slate-500 font-medium px-4">
              {answeredCount}/{deck.questions.length} answered
            </span>
          )}

          <button
            onClick={goNext}
            disabled={currentIndex === deck.questions.length - 1}
            className="p-3 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation dots */}
      <div className="flex justify-center gap-1.5 flex-wrap">
        {deck.questions.map((q, i) => {
          const a = progress.answers[q.id];
          let dotColor = 'bg-slate-700';
          if (a?.status === 'correct') dotColor = 'bg-green-500';
          if (a?.status === 'incorrect') dotColor = 'bg-red-500';
          if (i === currentIndex) dotColor += ' ring-2 ring-blue-500 ring-offset-1 ring-offset-slate-950';
          return (
            <button
              key={q.id}
              onClick={() => goTo(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${dotColor}`}
            />
          );
        })}
      </div>
    </div>
  );
};

export default QuizSession;
