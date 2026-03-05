import { Twitter, Github, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-[#050505] py-10 px-6 md:px-12 lg:px-24 border-t border-white/5 relative z-20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        
        {/* Left: Brand & Copyright */}
        <div className="flex flex-col items-center md:items-start gap-2">
          <Link to="/" className="text-[#E50914] font-display font-extrabold text-xl tracking-widest drop-shadow-[0_0_10px_rgba(229,9,20,0.3)] hover:scale-105 transition-transform origin-left">
            ANICLAW
          </Link>
          <p className="text-sm text-gray-500 font-medium">
            &copy; {new Date().getFullYear()} Aniclaw. All rights reserved.
          </p>
        </div>

        {/* Right: Links & Socials */}
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
          <div className="flex items-center gap-6 text-sm font-medium text-gray-400">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Support</a>
          </div>
          
          {/* Divider for desktop */}
          <div className="hidden md:block w-px h-4 bg-white/10"></div>

          <div className="flex items-center gap-5 text-gray-400">
            <a href="#" className="hover:text-[#E50914] transition-colors" aria-label="Twitter">
              <Twitter className="w-4 h-4" />
            </a>
            <a href="#" className="hover:text-[#E50914] transition-colors" aria-label="Discord">
              <MessageSquare className="w-4 h-4" />
            </a>
            <a href="#" className="hover:text-[#E50914] transition-colors" aria-label="GitHub">
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}
