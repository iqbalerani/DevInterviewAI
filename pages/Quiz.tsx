import React, { useState, useEffect, useCallback } from 'react';
import { CircleHelp } from 'lucide-react';
import { quizDecks } from '../data/quizDecks';
import { QuizProgress } from '../types';
import DeckGrid from '../components/quiz/DeckGrid';
import QuizSession from '../components/quiz/QuizSession';
import { useAuthStore } from '../store/authStore';

function getStorageKey(userId: string) {
  return `devproof-quiz-progress-${userId}`;
}

function loadProgress(userId: string): Record<string, QuizProgress> {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const Quiz: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? 'anonymous';
  const [view, setView] = useState<'decks' | 'session'>('decks');
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, QuizProgress>>(() => loadProgress(userId));

  useEffect(() => {
    setProgress(loadProgress(userId));
  }, [userId]);

  useEffect(() => {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(progress));
  }, [progress, userId]);

  const handleSelectDeck = useCallback((id: string) => {
    setSelectedDeckId(id);
    if (!progress[id]) {
      setProgress((prev) => ({
        ...prev,
        [id]: { deckId: id, answers: {}, lastAttemptedAt: Date.now(), currentIndex: 0 },
      }));
    }
    setView('session');
  }, [progress]);

  const handleBack = useCallback(() => {
    setView('decks');
    setSelectedDeckId(null);
  }, []);

  const handleUpdateProgress = useCallback((updated: QuizProgress) => {
    setProgress((prev) => ({ ...prev, [updated.deckId]: updated }));
  }, []);

  const totalCorrect = Object.values(progress).reduce(
    (sum, p) => sum + Object.values(p.answers).filter((a) => a.status === 'correct').length,
    0,
  );
  const totalQuestions = quizDecks.reduce((sum, d) => sum + d.questions.length, 0);

  const selectedDeck = quizDecks.find((d) => d.id === selectedDeckId);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12">
      {view === 'decks' && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold flex items-center gap-3">
                <CircleHelp className="w-8 h-8 text-blue-500" />
                Quizzes
              </h2>
              <p className="text-slate-400 mt-1">
                Test your knowledge with multiple-choice questions.
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-400">{totalCorrect}</p>
              <p className="text-xs text-slate-500">of {totalQuestions} correct</p>
            </div>
          </div>

          <DeckGrid decks={quizDecks} progress={progress} onSelectDeck={handleSelectDeck} />
        </>
      )}

      {view === 'session' && selectedDeck && progress[selectedDeck.id] && (
        <QuizSession
          deck={selectedDeck}
          progress={progress[selectedDeck.id]}
          onUpdateProgress={handleUpdateProgress}
          onBack={handleBack}
        />
      )}
    </div>
  );
};

export default Quiz;
