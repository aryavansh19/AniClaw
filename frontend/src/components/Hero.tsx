import { motion } from 'motion/react';
import { MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import SlantedPanels from './SlantedPanels';

export default function Hero() {
  return (
    <section className="relative w-full h-[115vh] bg-black overflow-hidden flex items-center justify-center font-sans">
      {/* Background Layers */}
      <SlantedPanels />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 z-20 bg-gradient-to-t from-black via-black/50 to-transparent" />
      <div className="absolute inset-0 z-20 bg-gradient-to-r from-black/80 via-black/30 to-black/80" />

      {/* Content */}
      <div className="relative z-30 flex flex-col items-center text-center px-6 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-display font-extrabold tracking-tight text-white mb-6 leading-[1.1]">
            Never miss an <span className="text-[#E50914] italic pr-2">episode.</span>
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        >
          <p className="text-base md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
            Select your favorite anime to get instant WhatsApp reminders and direct streaming links the moment a new episode drops. Stay ahead of the spoilers, watch instantly.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.4 }}
        >
          <Link to="/signup" className="group relative inline-flex items-center justify-center gap-2 sm:gap-3 px-6 py-4 md:px-10 md:py-5 bg-[#E50914] hover:bg-[#b80710] text-white rounded-full font-bold text-lg md:text-xl transition-all duration-300 hover:scale-105 shadow-[0_0_30px_rgba(229,9,20,0.4)]">
            <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
            <span className="whitespace-nowrap">Get WhatsApp Reminders</span>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="mt-8 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500 font-medium"
        >
          <div className="flex -space-x-2">
            {[1, 2, 3, 4].map((i) => (
              <img
                key={i}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-black object-cover"
                src={`https://picsum.photos/seed/user${i}/100/100`}
                alt="User avatar"
                referrerPolicy="no-referrer"
              />
            ))}
          </div>
          <p className="text-center sm:text-left">Join 10,000+ weebs already subscribed</p>
        </motion.div>
      </div>
    </section>
  );
}
