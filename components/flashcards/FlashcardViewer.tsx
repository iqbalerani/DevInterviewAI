import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, ChevronLeft, BookOpen, CheckCircle2 } from 'lucide-react';
import { FlashcardDeck, FlashcardProgress, FlashcardStatus } from '../../types';
import FlashcardItem from './FlashcardItem';
import ProgressBar from './ProgressBar';

interface FlashcardViewerProps {
  deck: FlashcardDeck;
  progress: FlashcardProgress;
  onUpdateProgress: (progress: FlashcardProgress) => void;
  onBack: () => void;
}

const FlashcardViewer: React.FC<FlashcardViewerProps> = ({
  deck, progress, onUpdateProgress, onBack,
}) => {
  const [currentIndex, setCurrentIndex] = useState(progress.currentIndex);
  const [isFlipped, setIsFlipped] = useState(false);
  const [direction, setDirection] = useState(0);

  const card = deck.cards[currentIndex];
  const cardStatus = progress.cardStatuses[card.id] || 'unseen';
  const mastered = Object.values(progress.cardStatuses).filter((s) => s === 'mastered').length;

  const goTo = useCallback((index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setIsFlipped(false);
    setCurrentIndex(index);
  }, [currentIndex]);

  const goNext = useCallback(() => {
    if (currentIndex < deck.cards.length - 1) goTo(currentIndex + 1);
  }, [currentIndex, deck.cards.length, goTo]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) goTo(currentIndex - 1);
  }, [currentIndex, goTo]);

  const setCardStatus = useCallback((status: FlashcardStatus) => {
    const updated: FlashcardProgress = {
      ...progress,
      cardStatuses: { ...progress.cardStatuses, [card.id]: status },
      lastStudiedAt: Date.now(),
      currentIndex,
    };
    onUpdateProgress(updated);
  }, [progress, card.id, currentIndex, onUpdateProgress]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === ' ') { e.preventDefault(); setIsFlipped((f) => !f); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x < -80) goNext();
    else if (info.offset.x > 80) goPrev();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="font-medium">Back to Decks</span>
        </button>
        <div className="text-sm text-slate-400 font-medium">
          {currentIndex + 1} / {deck.cards.length}
        </div>
      </div>

      {/* Deck title + progress */}
      <div>
        <h2 className="text-2xl font-bold text-slate-100">{deck.title}</h2>
        <div className="mt-2 max-w-xs">
          <ProgressBar mastered={mastered} total={deck.cards.length} />
        </div>
      </div>

      {/* Card area */}
      <div className="flex flex-col items-center gap-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={card.id}
            initial={{ opacity: 0, x: direction * 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -100 }}
            transition={{ duration: 0.25 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            className="w-full flex justify-center"
          >
            <FlashcardItem card={card} isFlipped={isFlipped} onFlip={() => setIsFlipped((f) => !f)} />
          </motion.div>
        </AnimatePresence>

        {/* Navigation arrows */}
        <div className="flex items-center gap-4">
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="p-3 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Status buttons */}
          <button
            onClick={() => setCardStatus('learning')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
              cardStatus === 'learning'
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Still Learning
          </button>
          <button
            onClick={() => setCardStatus('mastered')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
              cardStatus === 'mastered'
                ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Mastered
          </button>

          <button
            onClick={goNext}
            disabled={currentIndex === deck.cards.length - 1}
            className="p-3 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Card dots */}
      <div className="flex justify-center gap-1.5 flex-wrap">
        {deck.cards.map((c, i) => {
          const status = progress.cardStatuses[c.id] || 'unseen';
          let dotColor = 'bg-slate-700';
          if (status === 'learning') dotColor = 'bg-orange-500';
          if (status === 'mastered') dotColor = 'bg-green-500';
          if (i === currentIndex) dotColor += ' ring-2 ring-blue-500 ring-offset-1 ring-offset-slate-950';
          return (
            <button
              key={c.id}
              onClick={() => goTo(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${dotColor}`}
            />
          );
        })}
      </div>
    </div>
  );
};

export default FlashcardViewer;
