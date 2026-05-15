export default function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-white/5 bg-charcoal">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-gray-500 text-xs tracking-widest uppercase">
        <div className="flex items-center gap-3">
          <div className="relative w-13 h-13 flex items-center justify-center shrink-0">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-md" />
            <img src="/logo.png" alt="TOP87 Logo"
              className="relative w-13 h-13 object-contain drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]" />
          </div>
          <p>© 2026 Class of 1987. Digital Time Capsule Project.</p>
        </div>
        <div className="flex flex-wrap justify-center items-center gap-8">
          <a href="#" className="hover:text-gold transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-gold transition-colors">Terms of Alumni</a>
          <a href="#" className="hover:text-gold transition-colors px-4 py-2 border border-white/10 rounded-full">Contact Admin</a>
        </div>
      </div>
    </footer>
  );
}
