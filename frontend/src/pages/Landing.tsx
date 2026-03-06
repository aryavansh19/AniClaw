import { motion, useScroll, useTransform } from 'motion/react';
import Hero from '../components/Hero';
import Features from '../components/Features';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Contact from '../components/Contact';
import { StaggerTestimonials } from '../components/ui/stagger-testimonials';

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
        <Features />

        {/* Testimonials integrated */}
        <StaggerTestimonials />

        <Contact />
        <Footer />
      </div>
    </main>
  );
}
