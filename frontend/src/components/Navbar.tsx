import { motion, useScroll, useMotionValueEvent } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest > 150) {
      setHidden(true);
    } else {
      setHidden(false);
    }
  });

  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: hidden ? -100 : 0, opacity: hidden ? 0 : 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="fixed top-0 left-0 w-full z-50 px-6 py-6 md:px-12"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 cursor-pointer group">
          <span className="text-[#E50914] font-display font-extrabold text-3xl tracking-widest drop-shadow-[0_0_15px_rgba(229,9,20,0.5)] group-hover:scale-105 transition-transform origin-left">ANICLAW</span>
        </Link>

        {/* CTA - Separate Rectangular Buttons */}
        <div className="flex items-center gap-4">
          <Link to="/login" className="px-6 py-2.5 text-white hover:bg-white/10 rounded-md text-sm font-bold transition-colors">
            Login
          </Link>
          <Link to="/signup" className="px-6 py-2.5 bg-[#E50914] hover:bg-[#b80710] text-white rounded-md text-sm font-bold transition-all shadow-[0_0_15px_rgba(229,9,20,0.4)] hover:scale-105">
            Sign Up
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
