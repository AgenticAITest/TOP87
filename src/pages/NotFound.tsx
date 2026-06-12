import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-lg"
      >
        <p className="font-serif text-[8rem] font-bold text-forest/5 leading-none select-none">404</p>
        <h1 className="font-serif text-4xl font-bold text-forest -mt-8 mb-4">Page not found.</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          This page doesn't exist or you don't have access to it yet.
        </p>
        <Link
          to="/"
          className="mt-10 inline-block text-xs uppercase tracking-widest text-gray-500 hover:text-forest transition-colors"
        >
          ← Back to home
        </Link>
      </motion.div>
    </div>
  );
}
