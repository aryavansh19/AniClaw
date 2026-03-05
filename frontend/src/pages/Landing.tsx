import { motion, useScroll, useTransform } from 'motion/react';
import Hero from '../components/Hero';
import Features from '../components/Features';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Contact from '../components/Contact';

export default function Landing() {
  const { scrollYProgress } = useScroll();
  
  // Scale down the hero slightly and fade it out as we scroll
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.85]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.2]);

  return (
    <main className="bg-black text-white selection:bg-[#E50914] selection:text-white relative">
      <Navbar />

      {/* Fixed Hero Background */}
      <motion.div 
        className="fixed top-0 left-0 w-full h-[115vh] z-0 origin-top"
        style={{ scale, opacity }}
      >
        <Hero />
      </motion.div>

      {/* Spacer to allow scrolling past the fixed hero */}
      <div className="h-[115vh] w-full pointer-events-none"></div>

      {/* Features Section - Slides over the hero */}
      <div className="relative z-10 flex flex-col">
        {/* Subtle Straight Glowing Line Divider */}
        <div className="w-full relative z-30 flex justify-center">
          {/* Base subtle line */}
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#E50914]/30 to-transparent"></div>
          {/* Core glowing center */}
          <div className="absolute top-0 w-3/4 md:w-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#E50914] to-transparent shadow-[0_-5px_15px_1px_rgba(229,9,20,0.6)]"></div>
        </div>
        <Features />
        <Contact />
        <Footer />
      </div>
    </main>
  );
}
