import React from 'react';
import { motion } from 'framer-motion';
import { Flashcard } from '../../types';

interface FlashcardItemProps {
  card: Flashcard;
  isFlipped: boolean;
  onFlip: () => void;
}

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
  intermediate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  advanced: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const FlashcardItem: React.FC<FlashcardItemProps> = ({ card, isFlipped, onFlip }) => {
  return (
    <div
      className="w-full max-w-xl aspect-[3/2] cursor-pointer select-none"
      style={{ perspective: 1200 }}
      onClick={onFlip}
    >
      <motion.div
        className="relative w-full h-full"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front face */}
        <div
          className="absolute inset-0 bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${difficultyColors[card.difficulty]}`}>
              {card.difficulty}
            </span>
          </div>
          <p className="text-lg font-semibold text-slate-100 leading-relaxed">
            {card.front}
          </p>
          <p className="text-xs text-slate-500 text-center">Tap to reveal answer</p>
        </div>

        {/* Back face */}
        <div
          className="absolute inset-0 bg-slate-900 border border-slate-700 rounded-3xl p-8 flex flex-col overflow-y-auto"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <p className="text-sm text-slate-300 leading-relaxed flex-1">
            {card.back}
          </p>
          {card.codeSnippet && (
            <pre className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">
              {card.codeSnippet}
            </pre>
          )}
          <div className="flex flex-wrap gap-2 mt-4">
            {card.tags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-slate-800 text-slate-500 rounded-md text-xs">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default FlashcardItem;
