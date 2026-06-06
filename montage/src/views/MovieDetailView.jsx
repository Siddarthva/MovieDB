import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { Play, Star, Film, Tv } from 'lucide-react';

// ==========================================
// 1. DUMMY DATA (Replace with Supabase data later)
// ==========================================
const MOCK_MOVIE = {
  id: 'love-and-war',
  title: 'Love and War',
  type: 'Movie',
  year: '2026',
  censorRating: 'UA',
  runtime: '2h 45m',
  rating: '8.4',
  director: 'Sanjay Leela Bhansali',
  country: 'India',
  language: 'Hindi',
  genres: ['Period Drama', 'Romance', 'Epic'],
  poster: 'https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?q=80&w=600&auto=format&fit=crop',
  backdrop: 'https://images.unsplash.com/photo-1464692805480-a69dfaafdb0d?q=80&w=2000&auto=format&fit=crop',
  synopsis: 'Love and War is an upcoming Hindi language period romantic drama film set against the backdrop of a massive conflict. It explores the enduring power of human connection, sacrifice, and the lengths people will go to for love amidst chaos. Directed by the visionary Sanjay Leela Bhansali, it promises breathtaking visuals and intense emotional depth.',
  cast: [
    { id: '1', name: 'Alia Bhatt', role: 'Lead Actress', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop' },
    { id: '2', name: 'Ranbir Kapoor', role: 'Lead Actor', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop' },
    { id: '3', name: 'Vicky Kaushal', role: 'Supporting Actor', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop' },
    { id: '4', name: 'Sanjay L. Bhansali', role: 'Director', image: null },
  ]
};

const MOCK_RECOMMENDATIONS = Array(6).fill(null).map((_, i) => ({
  id: `rec-${i}`,
  title: `Epic Masterpiece ${i + 1}`,
  poster: `https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=400&h=600&fit=crop&q=80&sig=${i}`,
  year: 2025 - i
}));

// ==========================================
// 2. HELPER COMPONENTS
// ==========================================

const getInitials = (name) => {
  const words = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'NA';
  return words.length === 1 ? words[0].slice(0, 2).toUpperCase() : `${words[0][0]}${words[1][0]}`.toUpperCase();
};

const Avatar = ({ src, name }) => {
  if (src) return <img src={src} alt={name} className="w-full h-full object-cover" />;
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900 text-white font-bold text-lg">
      {getInitials(name)}
    </div>
  );
};

const MiniTitleCard = ({ title }) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className="w-[200px] h-[300px] flex-shrink-0 relative rounded-xl overflow-hidden cursor-pointer group"
  >
    <img src={title.poster} alt={title.title} className="w-full h-full object-cover" />
    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
      <p className="text-white font-bold text-sm leading-tight">{title.title}</p>
      <p className="text-gray-400 text-xs">{title.year}</p>
    </div>
  </motion.div>
);

const InfiniteScrollRow = ({ items }) => {
  const controls = useAnimationControls();
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef(null);

  const tripleItems = useMemo(() => [...items, ...items, ...items], [items]);
  const CARD_WIDTH = 200;
  const GAP = 16;
  const singleSetWidth = items.length * (CARD_WIDTH + GAP);

  useEffect(() => {
    if (isHovered) {
      controls.stop();
    } else {
      controls.start({
        x: [0, -singleSetWidth],
        transition: {
          repeat: Infinity,
          ease: 'linear',
          duration: items.length * 4,
        }
      });
    }
  }, [isHovered, controls, singleSetWidth, items.length]);

  return (
    <div className="relative overflow-hidden py-4 -mx-6 px-6">
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#050505] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#050505] to-transparent z-10 pointer-events-none" />
      <motion.div
        ref={containerRef}
        animate={controls}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex gap-[16px] w-max"
      >
        {tripleItems.map((item, idx) => (
          <MiniTitleCard key={`${item.id}-${idx}`} title={item} />
        ))}
      </motion.div>
    </div>
  );
};

// ==========================================
// 3. MAIN PAGE COMPONENT
// ==========================================
export default function MovieDetailView() {
  const [title] = useState(MOCK_MOVIE);

  if (!title) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-x-hidden">
      
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-50"
          style={{ backgroundImage: `url(${title.backdrop})` }}
        />
        <div className="absolute inset-0 bg-[#050505]/80 backdrop-blur-3xl" />
      </div>

      <main className="relative z-10 w-full px-8 md:px-16 lg:px-24 mx-auto max-w-[1400px] pt-[40vh] pb-24">
        
        <div className="flex flex-col md:flex-row gap-10 lg:gap-16 items-start">
          <div className="shrink-0 w-48 md:w-72 -mt-16 md:-mt-32">
            <img 
              src={title.poster} 
              alt={title.title}
              className="w-full aspect-[2/3] object-cover rounded-2xl shadow-2xl" 
            />
          </div>
          
          <div className="flex flex-col gap-5 w-full">
            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300 font-medium">
              <span>{title.type}</span>
              <span className="text-gray-600">•</span>
              <span>{title.year}</span>
              {title.censorRating && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="border border-gray-500 px-1.5 py-0.5 rounded text-xs uppercase tracking-wide">
                    {title.censorRating}
                  </span>
                </>
              )}
              {title.runtime && (
                <>
                  <span className="text-gray-600">•</span>
                  <span>{title.runtime}</span>
                </>
              )}
            </div>

            {/* Title */}
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-white leading-none">
              {title.title}
            </h1>

            {/* Genre tags */}
            <div className="flex flex-wrap gap-2">
              {title.genres.map(genre => (
                <span
                  key={genre}
                  className="px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-gray-200 backdrop-blur-sm"
                >
                  {genre}
                </span>
              ))}
            </div>

            {/* Synopsis */}
            <p className="text-gray-300 text-sm lg:text-base leading-relaxed line-clamp-4 max-w-2xl">
              {title.synopsis}
            </p>

            {/* Meta grid */}
            <div className="flex flex-wrap gap-6 lg:gap-10">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-gray-500 uppercase tracking-widest">Directed By</span>
                <span className="font-semibold text-sm text-white">{title.director}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-gray-500 uppercase tracking-widest">Country</span>
                <span className="font-semibold text-sm text-white">{title.country}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-gray-500 uppercase tracking-widest">Language</span>
                <span className="font-semibold text-sm text-white">{title.language}</span>
              </div>
            </div>

            {/* Action row */}
            <div className="flex flex-wrap items-center gap-6 mt-1">
              <button className="w-fit inline-flex items-center gap-2 px-8 py-3 bg-white text-black font-bold rounded-lg mt-2 shadow-lg">
                <Play className="w-5 h-5 fill-black shrink-0" />
                Watch Trailer
              </button>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 shrink-0" />
                <span className="text-xl font-bold">{title.rating}</span>
                <span className="text-gray-400 text-sm">/10</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-20">
          <h2 className="text-2xl font-bold mb-6">Cast &amp; Crew</h2>
          {title.cast.length > 0 ? (
            <div className="flex overflow-x-auto gap-6 pb-4" style={{ scrollbarWidth: 'none' }}>
              {title.cast.map((person) => (
                <div key={person.id} className="flex flex-col items-center gap-3 min-w-[100px]">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 bg-gray-800 shrink-0 shadow-lg">
                    <Avatar src={person.image} name={person.name} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold leading-tight">{person.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{person.role}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No cast information available.</p>
          )}
        </div>

        <div className="mt-20">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Vibe Match</p>
          <h2 className="text-2xl font-bold mb-6">Similar Titles</h2>
          <InfiniteScrollRow items={MOCK_RECOMMENDATIONS} />
        </div>

      </main>
    </div>
  );
}
