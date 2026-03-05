import { motion } from 'motion/react';
import { Mail, Send } from 'lucide-react';

export default function Contact() {
  return (
    <section className="relative w-full bg-zinc-950 text-white py-24 px-6 md:px-12 lg:px-24 z-20">
      <div className="max-w-5xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-[#0b141a] border border-white/10 rounded-[2rem] p-10 md:p-16 shadow-[0_20px_60px_rgba(229,9,20,0.15)] relative overflow-hidden"
        >
          {/* Red Glow */}
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#E50914]/20 blur-[100px] rounded-full pointer-events-none transform translate-x-1/2 -translate-y-1/2"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1">
              <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">Stay in the loop.</h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                Have questions or want to request a new anime? Drop us a message and our team will get back to you faster than a ninja.
              </p>
              <div className="flex items-center gap-4 text-gray-300">
                <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center border border-white/5 shadow-inner">
                  <Mail className="w-5 h-5 text-[#E50914]" />
                </div>
                <span className="font-medium">support@ani-claw.com</span>
              </div>
            </div>
            
            <div className="flex-1 w-full">
              <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
                <input 
                  type="text" 
                  placeholder="Your Name" 
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-5 py-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E50914] transition-colors"
                />
                <input 
                  type="email" 
                  placeholder="Email Address" 
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-5 py-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E50914] transition-colors"
                />
                <textarea 
                  placeholder="Your Message" 
                  rows={4}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-5 py-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E50914] transition-colors resize-none"
                ></textarea>
                <button className="w-full bg-[#E50914] hover:bg-[#b80710] text-white rounded-xl px-5 py-4 font-bold text-lg transition-all shadow-[0_0_20px_rgba(229,9,20,0.3)] hover:scale-[1.02] flex items-center justify-center gap-2 mt-2">
                  <span>Send Message</span>
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
