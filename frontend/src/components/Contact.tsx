import { motion } from 'motion/react';
import { Mail, Send } from 'lucide-react';

export default function Contact() {
  return (
    <section className="relative w-full bg-zinc-950 text-white z-20 border-t border-white/10">
      <div className="w-full relative overflow-hidden">

        {/* Subtle Linear Red Glow */}
        <div className="absolute top-0 right-0 w-[500px] h-full bg-gradient-to-l from-[#E50914]/5 to-transparent pointer-events-none"></div>

        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 relative z-10">

          {/* Left Side: Copy */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="p-10 md:p-16 lg:p-24 lg:border-r border-white/5 flex flex-col justify-center"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 tracking-tight uppercase">Stay connected.</h2>
            <p className="text-gray-400 text-lg md:text-xl mb-12 leading-relaxed max-w-lg">
              Missing an anime? Found a bug? Drop us a line. We read every message and ship updates fast.
            </p>

            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4 group cursor-pointer w-fit">
                <div className="w-12 h-12 bg-black flex items-center justify-center border border-white/10 group-hover:border-[#E50914] transition-colors rounded-sm shadow-inner">
                  <Mail className="w-5 h-5 text-gray-400 group-hover:text-[#E50914] transition-colors" />
                </div>
                <span className="font-medium text-gray-300 group-hover:text-white transition-colors text-lg tracking-wide">support@ani-claw.com</span>
              </div>
            </div>
          </motion.div>

          {/* Right Side: Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="p-10 md:p-16 lg:p-24 bg-black/40 flex flex-col justify-center border-t lg:border-t-0 border-white/5"
          >
            <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest text-[#E50914] font-bold">NAME</label>
                  <input
                    type="text"
                    placeholder="Killua Zoldyck"
                    className="w-full bg-black border border-white/10 rounded-sm px-5 py-4 text-white placeholder:text-zinc-700 focus:outline-none focus:border-[#E50914] transition-all focus:bg-zinc-950"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest text-[#E50914] font-bold">EMAIL</label>
                  <input
                    type="email"
                    placeholder="killua@hxa.com"
                    className="w-full bg-black border border-white/10 rounded-sm px-5 py-4 text-white placeholder:text-zinc-700 focus:outline-none focus:border-[#E50914] transition-all focus:bg-zinc-950"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest text-[#E50914] font-bold">MESSAGE</label>
                <textarea
                  placeholder="Need Hunter x Hunter added ASAP..."
                  rows={5}
                  className="w-full bg-black border border-white/10 rounded-sm px-5 py-4 text-white placeholder:text-zinc-700 focus:outline-none focus:border-[#E50914] transition-all focus:bg-zinc-950 resize-none"
                ></textarea>
              </div>

              <button className="group mt-4 w-full bg-[#E50914] hover:bg-white text-white hover:text-black rounded-sm px-6 py-5 font-black text-lg uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-3">
                <span>Deploy Message</span>
                <Send className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </button>
            </form>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
