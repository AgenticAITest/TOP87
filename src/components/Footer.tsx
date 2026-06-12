export default function Footer() {
  return (
    <footer className="mt-12 pt-8 border-t border-amber-200 px-6 md:px-8 pb-8">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="flex items-center space-x-2 text-forest mb-4 font-serif text-2xl italic font-bold">
          {/* Shamrock icon */}
          <svg className="w-6 h-6 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C11.3 2 10.7 2.1 10.1 2.3C9.5 2.5 9 2.7 8.5 3C8 3.3 7.6 3.6 7.2 4C6.1 4.9 5.3 6.1 5 7.4C5 7.6 5 7.8 5 8C5 10.8 7.2 13 10 13H11V18H10V20H14V18H13V13H14C16.8 13 19 10.8 19 8C19 7.8 19 7.6 19 7.4C18.7 6.1 17.9 4.9 16.8 4C16.4 3.6 16 3.3 15.5 3C15 2.7 14.5 2.5 13.9 2.3C13.3 2.1 12.7 2 12 2ZM10.5 5C10.8 5 11 5.2 11 5.5V9.5C11 9.8 10.8 10 10.5 10C10.2 10 10 9.8 10 9.5V5.5C10 5.2 10.2 5 10.5 5ZM13.5 5C13.8 5 14 5.2 14 5.5V9.5C14 9.8 13.8 10 13.5 10C13.2 10 13 9.8 13 9.5V5.5C13 5.2 13.2 5 13.5 5Z" />
          </svg>
          <span>Dari kita, oleh kita, untuk kita</span>
        </div>

        <div className="flex flex-col md:flex-row md:justify-between w-full text-[10px] text-gray-500 uppercase tracking-widest mt-8 gap-4">
          <p>TOP87 © 2026 Panitia Reuni TOP87. All rights reserved.</p>
          <div className="flex justify-center space-x-4">
            <span className="cursor-pointer hover:text-forest transition-colors">Instagram</span>
            <span className="cursor-pointer hover:text-forest transition-colors">WhatsApp</span>
            <span className="cursor-pointer hover:text-forest transition-colors">Email</span>
            <span className="cursor-pointer hover:text-forest transition-colors">Hubungi Panitia</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
