import { motion } from 'motion/react';
import { Hammer } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  title: string;
  description?: string;
  phase?: string;
}

export default function Placeholder({ title, description, phase }: Props) {
  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-6 pt-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-lg"
      >
        <div className="w-16 h-16 rounded-full border border-gold/20 glass flex items-center justify-center mx-auto mb-8">
          <Hammer size={24} className="text-gold/50" />
        </div>
        <p className="text-xs uppercase tracking-[0.3em] text-gold/60 mb-4">
          {phase ?? 'Coming soon'}
        </p>
        <h1 className="font-serif text-5xl font-bold text-white mb-4">{title}</h1>
        {description && (
          <p className="text-gray-500 leading-relaxed text-sm">{description}</p>
        )}
        <Link
          to="/"
          className="mt-10 inline-block text-xs uppercase tracking-widest text-gray-600 hover:text-gold transition-colors"
        >
          ← Back to home
        </Link>
      </motion.div>
    </div>
  );
}
