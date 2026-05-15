import { motion } from 'motion/react';
import { Chrome } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Hero() {
  const { user, signInWithGoogle } = useAuth();
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center pt-24 overflow-hidden">
      {/* Background with nostalgic feel */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1540317580384-e5d43616b9aa?auto=format&fit=crop&q=80&w=1920&h=1080&blur=2"
          alt="Refined high school atmosphere"
          className="w-full h-full object-cover opacity-30 grayscale"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal via-transparent to-charcoal" />
        <div className="absolute inset-0 bg-navy/40" />
        {/* Logo watermark grid */}
        <div className="absolute inset-0 grid grid-cols-3 place-items-center opacity-[0.08] pointer-events-none select-none">
          {Array.from({ length: 6 }).map((_, i) => (
            <img key={i} src="/logo.png" alt="" className="w-64 h-64 object-contain" />
          ))}
        </div>
      </div>

      {/* Hero Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <span className="inline-block px-4 py-1 mb-6 text-xs font-bold tracking-[0.3em] uppercase border border-gold/30 text-gold rounded-full glass-gold">
            No One Is Left Behind
          </span>
          <h1 className="text-5xl md:text-8xl font-bold text-white mb-6 tracking-tight leading-[0.9]">
            A Legacy <br />
            <span className="italic text-gold gold-glow">Reunited.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 font-light leading-relaxed">
            Welcome back, Class of 1987. Explore our shared history, 
            connect with classmates across the globe, and bridge the gap between <span className="text-white">then</span> and <span className="text-white">now</span>.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {!user && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={signInWithGoogle}
                className="group relative flex items-center gap-3 bg-gold hover:bg-gold-light text-charcoal px-8 py-4 rounded-full font-bold transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] border-2 border-gold-light/50"
              >
                <Chrome className="w-5 h-5" />
                <span>Sign in with Google</span>
                <div className="absolute inset-0 rounded-full bg-gold blur-lg opacity-0 group-hover:opacity-20 transition-opacity" />
              </motion.button>
            )}
            <button className="px-8 py-4 rounded-full font-medium text-white glass hover:bg-white/10 transition-colors uppercase tracking-widest text-sm">
              Discover More
            </button>
          </div>
        </motion.div>
      </div>

    </section>
  );
}
