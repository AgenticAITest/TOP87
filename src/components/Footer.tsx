export default function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-white/5 bg-charcoal">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-gray-500 text-xs tracking-widest uppercase">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-gold/30 flex items-center justify-center font-serif text-[10px] text-gold font-bold">87</div>
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
