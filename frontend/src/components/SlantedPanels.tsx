import { motion } from 'motion/react';

const ANIME_IMAGES = [
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-buvcRTBx4NSm.jpg", // AOT
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-WBsBl0ClmgYL.jpg", // Demon Slayer
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx1535-kUgkcrfOrkUM.jpg", // Death Note
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx113415-LHBAeoZDIsnF.jpg", // JJK
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21459-nYh85uj2Fuwr.jpg", // MHA
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx11061-y5gsT1hoHuHw.png", // HxH
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21087-B5DHjqZ3kW4b.jpg", // One Punch Man
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx20958-HuFJyr54Mmir.jpg", // A Silent Voice
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21-ELSYx3yMPcKM.jpg", // One Piece
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx5114-nSWCgQlmOMtj.jpg", // FMAB
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx20-dE6UHbFFg1A5.jpg", // Naruto
  "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21519-SUo3ZQuCbYhJ.png", // Your Name
];

const DOUBLE_IMAGES = [...ANIME_IMAGES, ...ANIME_IMAGES];

const Row = ({ direction = 'left', speed = 20, offset = 0 }: { direction?: 'left' | 'right', speed?: number, offset?: number }) => {
  return (
    <div className="flex w-max" style={{ transform: `translateX(${offset}px)` }}>
      <motion.div
        className="flex w-max"
        animate={{ x: direction === 'left' ? ['0%', '-50%'] : ['-50%', '0%'] }}
        transition={{ repeat: Infinity, ease: 'linear', duration: speed }}
      >
        {[0, 1].map((setIndex) => (
          <div key={setIndex} className="flex shrink-0">
            {DOUBLE_IMAGES.map((src, i) => (
              <div key={`${setIndex}-${i}`} className="w-28 h-40 md:w-36 md:h-52 rounded-lg overflow-hidden shadow-xl shrink-0 border border-white/5 mr-4">
                <img src={src} alt="Anime Poster" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default function SlantedPanels() {
  return (
    <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none flex items-center justify-center opacity-60">
      <div className="flex flex-col gap-4 transform -rotate-12 scale-150 origin-center">
        <Row direction="left" speed={40} offset={-100} />
        <Row direction="right" speed={35} offset={0} />
        <Row direction="left" speed={45} offset={-200} />
        <Row direction="right" speed={38} offset={-50} />
      </div>
    </div>
  );
}
