import { motion } from 'motion/react';

const ANIME_IMAGES = [
  "https://picsum.photos/seed/anime1/300/450?blur=1",
  "https://picsum.photos/seed/anime2/300/450?blur=1",
  "https://picsum.photos/seed/anime3/300/450?blur=1",
  "https://picsum.photos/seed/anime4/300/450?blur=1",
  "https://picsum.photos/seed/anime5/300/450?blur=1",
  "https://picsum.photos/seed/anime6/300/450?blur=1",
  "https://picsum.photos/seed/anime7/300/450?blur=1",
  "https://picsum.photos/seed/anime8/300/450?blur=1",
  "https://picsum.photos/seed/anime9/300/450?blur=1",
  "https://picsum.photos/seed/anime10/300/450?blur=1",
  "https://picsum.photos/seed/anime11/300/450?blur=1",
  "https://picsum.photos/seed/anime12/300/450?blur=1",
];

const Row = ({ direction = 'left', speed = 20, offset = 0 }: { direction?: 'left' | 'right', speed?: number, offset?: number }) => {
  return (
    <div className="flex w-max" style={{ transform: `translateX(${offset}px)` }}>
      <motion.div
        className="flex gap-4"
        animate={{ x: direction === 'left' ? ['0%', 'calc(-50% - 0.5rem)'] : ['calc(-50% - 0.5rem)', '0%'] }}
        transition={{ repeat: Infinity, ease: 'linear', duration: speed }}
      >
        {/* Set 1 */}
        <div className="flex gap-4 shrink-0">
          {[...ANIME_IMAGES, ...ANIME_IMAGES].map((src, i) => (
            <div key={`set1-${i}`} className="w-28 h-40 md:w-36 md:h-52 rounded-lg overflow-hidden shadow-xl shrink-0 border border-white/5">
              <img src={src} alt="Anime Poster" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ))}
        </div>
        {/* Set 2 (Identical clone for seamless looping) */}
        <div className="flex gap-4 shrink-0">
          {[...ANIME_IMAGES, ...ANIME_IMAGES].map((src, i) => (
            <div key={`set2-${i}`} className="w-28 h-40 md:w-36 md:h-52 rounded-lg overflow-hidden shadow-xl shrink-0 border border-white/5">
              <img src={src} alt="Anime Poster" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ))}
        </div>
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
