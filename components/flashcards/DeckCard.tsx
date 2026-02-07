import React from 'react';
import { motion } from 'framer-motion';
import {
  Atom, FileCode2, Container, Network, Boxes, Server, Database, GitBranch,
} from 'lucide-react';
import { FlashcardDeck, FlashcardProgress } from '../../types';
import ProgressBar from './ProgressBar';

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  Atom, FileCode2, Container, Network, Boxes, Server, Database, GitBranch,
};

interface DeckCardProps {
  deck: FlashcardDeck;
  progress?: FlashcardProgress;
  onClick: () => void;
}

const DeckCard: React.FC<DeckCardProps> = ({ deck, progress, onClick }) => {
  const Icon = iconMap[deck.icon] || Boxes;
  const mastered = progress
    ? Object.values(progress.cardStatuses).filter((s) => s === 'mastered').length
    : 0;
  const total = deck.cards.length;

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-slate-900 border border-slate-800 rounded-3xl p-6 cursor-pointer transition-colors hover:border-slate-700 relative overflow-hidden group"
    >
      {/* Subtle glow blob */}
      <div className={`absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br ${deck.gradient} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`} />

      <div className="relative z-10 flex flex-col gap-4">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${deck.gradient} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-100">{deck.title}</h3>
          <p className="text-sm text-slate-400 mt-1 line-clamp-2">{deck.description}</p>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{total} cards</span>
          <span className="px-2 py-0.5 bg-slate-800 rounded-md">{deck.category}</span>
        </div>
        <ProgressBar mastered={mastered} total={total} />
      </div>
    </motion.div>
  );
};

export default DeckCard;
