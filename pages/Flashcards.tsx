import React, { useState, useEffect, useCallback } from 'react';
import { Layers } from 'lucide-react';
import { flashcardDecks } from '../data/flashcardDecks';
import { FlashcardProgress } from '../types';
import DeckGrid from '../components/flashcards/DeckGrid';
import FlashcardViewer from '../components/flashcards/FlashcardViewer';
import { useAuthStore } from '../store/authStore';

function getStorageKey(userId: string) {
  return `devproof-flashcard-progress-${userId}`;
}

function loadProgress(userId: string): Record<string, FlashcardProgress> {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const Flashcards: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? 'anonymous';
  const [view, setView] = useState<'decks' | 'study'>('decks');
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, FlashcardProgress>>(() => loadProgress(userId));

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
        [id]: { deckId: id, cardStatuses: {}, lastStudiedAt: Date.now(), currentIndex: 0 },
      }));
    }
    setView('study');
  }, [progress]);

  const handleBack = useCallback(() => {
    setView('decks');
    setSelectedDeckId(null);
  }, []);

  const handleUpdateProgress = useCallback((updated: FlashcardProgress) => {
    setProgress((prev) => ({ ...prev, [updated.deckId]: updated }));
  }, []);

  const totalMastered = Object.values(progress).reduce(
    (sum, p) => sum + Object.values(p.cardStatuses).filter((s) => s === 'mastered').length,
    0,
  );
  const totalCards = flashcardDecks.reduce((sum, d) => sum + d.cards.length, 0);

  const selectedDeck = flashcardDecks.find((d) => d.id === selectedDeckId);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12">
      {view === 'decks' && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold flex items-center gap-3">
                <Layers className="w-8 h-8 text-blue-500" />
                Flashcards
              </h2>
              <p className="text-slate-400 mt-1">
                Study common technical interview topics with interactive cards.
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-400">{totalMastered}</p>
              <p className="text-xs text-slate-500">of {totalCards} mastered</p>
            </div>
          </div>

          <DeckGrid decks={flashcardDecks} progress={progress} onSelectDeck={handleSelectDeck} />
        </>
      )}

      {view === 'study' && selectedDeck && progress[selectedDeck.id] && (
        <FlashcardViewer
          deck={selectedDeck}
          progress={progress[selectedDeck.id]}
          onUpdateProgress={handleUpdateProgress}
          onBack={handleBack}
        />
      )}
    </div>
  );
};

export default Flashcards;
