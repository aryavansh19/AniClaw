import { motion } from 'motion/react';
import { Bell, Zap, Clock, CheckCheck, Phone, Video, MoreVertical, Plus, Camera, Mic } from 'lucide-react';

const features = [
  { icon: <Bell className="w-6 h-6 text-[#E50914]" />, title: "Instant Notifications", desc: "Get pinged the second a new episode is available on your favorite streaming platform." },
  { icon: <Zap className="w-6 h-6 text-[#E50914]" />, title: "Zero Delay", desc: "Our bots monitor releases 24/7 so you don't have to keep refreshing." },
  { icon: <Clock className="w-6 h-6 text-[#E50914]" />, title: "Custom Schedule", desc: "Set quiet hours or batch notifications so you only get alerted when you're ready to watch." },
];

const Message = ({ text, isUser, time, delay, children }: { text?: string, isUser?: boolean, time: string, delay: number, children?: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9, x: isUser ? 20 : -20, y: 10 }}
    whileInView={{ opacity: 1, scale: 1, x: 0, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, type: "spring", stiffness: 250, damping: 25 }}
    className={`relative z-10 p-2 px-3 rounded-xl text-[14px] shadow-sm max-w-[85%] ${isUser
      ? "bg-[#E50914] text-white self-end rounded-tr-none"
      : "bg-[#202c33] text-white self-start rounded-tl-none"
      }`}
  >
    {/* Message Tail */}
    <div
      className={`absolute top-0 w-3 h-3 ${isUser ? '-right-2 bg-[#E50914]' : '-left-2 bg-[#202c33]'}`}
      style={{ clipPath: isUser ? 'polygon(0 0, 0 100%, 100% 0)' : 'polygon(100% 0, 100% 100%, 0 0)' }}
    />

    <div className="leading-snug">{text || children}</div>

    <div className="flex items-center justify-end gap-1 mt-1 float-right ml-3">
      <span className="text-[10px] text-white/70">{time}</span>
      {isUser && <CheckCheck className="w-[14px] h-[14px] text-white/90" />}
    </div>
  </motion.div>
);

export default function Features() {
  return (
    <section className="relative w-full min-h-screen bg-zinc-950 text-white pb-24 pt-12 rounded-t-[3rem] border-t border-[#E50914]/20 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] px-6 md:px-12 lg:px-24 z-20 overflow-hidden">
      {/* Main Section Neon Heading */}
      <motion.div
        initial={{ opacity: 0, y: -30, filter: 'blur(10px)' }}
        whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-7xl mx-auto mt-6 mb-16 md:mb-20"
      >
        <div className="flex items-center justify-center w-full gap-4 md:gap-6">
          {/* Left Neon Line */}
          <div className="h-[2px] flex-1 bg-gradient-to-l from-[#E50914] to-transparent shadow-[0_0_15px_rgba(229,9,20,0.8)]"></div>

          <h2 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-center shrink-0">
            Never Get Spoiled Again.
          </h2>

          {/* Right Neon Line */}
          <div className="h-[2px] flex-1 bg-gradient-to-r from-[#E50914] to-transparent shadow-[0_0_15px_rgba(229,9,20,0.8)]"></div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-8 items-center">

        {/* Left: WhatsApp Mockup */}
        <div className="flex justify-center lg:justify-center relative">
          {/* Subtle glow behind the phone */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[600px] bg-[#E50914]/20 blur-[100px] rounded-full pointer-events-none"></div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-[320px] h-[650px] bg-[#0b141a] rounded-[3rem] border-[8px] border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col"
          >
            {/* Phone Header */}
            <div className="bg-[#202c33] px-3 py-3 flex items-center gap-3 z-20 shadow-md">
              <div className="flex items-center gap-2 flex-1">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E50914] to-[#b80710] flex items-center justify-center font-bold text-white shadow-inner overflow-hidden">
                  <img src="https://picsum.photos/seed/animebot/100/100" alt="Bot" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-white text-[15px] leading-tight">Ani-Claw Bot</span>
                  <span className="text-[11px] text-[#E50914]">online</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-gray-300">
                <Video className="w-5 h-5" />
                <Phone className="w-4 h-4" />
                <MoreVertical className="w-5 h-5" />
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 p-4 flex flex-col gap-3 relative overflow-hidden">
              {/* Chat Background Pattern */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://static.whatsapp.net/rsrc.php/v3/yl/r/r_Q01z1o0.png")', backgroundSize: 'cover' }}></div>

              {/* Date Badge */}
              <div className="flex justify-center mb-2">
                <span className="bg-[#182229] text-gray-400 text-[11px] px-3 py-1 rounded-lg shadow-sm">Today</span>
              </div>

              {/* Messages Sequence */}
              <Message time="10:00 AM" delay={0.5}>
                Hey! 👋 Welcome to Ani-Claw.
              </Message>

              <Message time="10:00 AM" delay={1.5}>
                What anime are you currently watching?
              </Message>

              <Message isUser time="10:02 AM" delay={3.0}>
                Solo Leveling
              </Message>

              <Message time="10:02 AM" delay={4.5}>
                Awesome! I'll ping you as soon as Episode 8 drops. ⚔️
              </Message>

              <Message time="10:30 AM" delay={6.5}>
                <div className="flex flex-col gap-2">
                  <div className="font-bold text-[#E50914] flex items-center gap-1">
                    <Bell className="w-4 h-4" /> New Episode Alert!
                  </div>
                  <div className="w-full h-24 rounded-lg overflow-hidden relative">
                    <img src="https://picsum.photos/seed/sololeveling/300/150" alt="Thumbnail" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center pl-1">
                        <div className="w-3 h-3 bg-[#E50914]" style={{ clipPath: 'polygon(0 0, 0 100%, 100% 50%)' }}></div>
                      </div>
                    </div>
                  </div>
                  <p><b>Solo Leveling</b> Episode 8 is out now!</p>
                  <a href="#" className="text-white/80 hover:text-white underline text-sm">Watch now on Crunchyroll</a>
                </div>
              </Message>
            </div>

            {/* Chat Input */}
            <div className="bg-[#202c33] p-2 px-3 flex gap-2 items-center z-20">
              <Plus className="w-6 h-6 text-gray-400" />
              <div className="flex-1 bg-[#2a3942] rounded-full h-10 px-4 flex items-center justify-between text-gray-400 text-[15px]">
                <span>Message</span>
                <Camera className="w-5 h-5" />
              </div>
              <div className="w-10 h-10 bg-[#E50914] rounded-full flex items-center justify-center shadow-md shrink-0">
                <Mic className="w-5 h-5 text-white" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right: Features List */}
        <div className="flex flex-col gap-10 lg:pl-10">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-8 md:mb-12"
          >
            <p className="text-gray-300 text-xl md:text-2xl leading-relaxed">We track release schedules across all major platforms so you can watch the moment it drops. Straight to your inbox.</p>
          </motion.div>

          <div className="flex flex-col gap-8 mt-2">
            {features.map((feat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + idx * 0.15, duration: 0.5 }}
                className="flex gap-5 group"
              >
                <div className="mt-1 bg-zinc-900 p-4 rounded-2xl border border-white/5 h-fit group-hover:border-[#E50914]/30 transition-colors duration-300 shadow-lg">
                  {feat.icon}
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2 text-gray-100">{feat.title}</h3>
                  <p className="text-gray-400 leading-relaxed text-lg">{feat.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
