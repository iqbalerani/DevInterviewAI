import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { QuizDeck, QuizProgress } from '../../types';
import DeckCard from './DeckCard';

interface DeckGridProps {
  decks: QuizDeck[];
  progress: Record<string, QuizProgress>;
  onSelectDeck: (id: string) => void;
}

const categories = ['All', 'Frontend', 'Backend', 'DevOps', 'Architecture'];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const DeckGrid: React.FC<DeckGridProps> = ({ decks, progress, onSelectDeck }) => {
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = activeCategory === 'All'
    ? decks
    : decks.filter((d) => d.category === activeCategory);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="show"
        key={activeCategory}
      >
        {filtered.map((deck) => (
          <motion.div key={deck.id} variants={itemVariants}>
            <DeckCard
              deck={deck}
              progress={progress[deck.id]}
              onClick={() => onSelectDeck(deck.id)}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default DeckGrid;
