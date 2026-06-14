import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

import { useCatalog } from '../hooks/useCatalog';
import { useHourlyFeatured } from '../hooks/useHourlyFeatured';

import HeroSection from '../components/ui/HeroSection';
import SkeletonRow from '../components/ui/SkeletonRow';

const ScrollRow = lazy(() => import('../components/ui/ScrollRow'));

const SKELETON_LABELS = [
  'The Masterpieces',
  'High-Octane Action',
  'Mind-Bending Sci-Fi',
  'Emotional Epics',
  'Dark & Gritty',
  'Pure Spectacle',
  'Fast-Paced Thrills',
  'Upcoming Anticipation',
  'Cinematic Classics',
  'Hidden Gems',
];

export default function HomeView({ onNavigate }) {
  const { titles, categories, loading } = useCatalog();
  const { featured: heroPool } = useHourlyFeatured();
  const [showSkeleton, setShowSkeleton] = useState(true);

  const heroTitles = useMemo(
    () => (heroPool.length > 0 ? heroPool : titles.slice(0, 5)),
    [heroPool, titles],
  );

  useEffect(() => {
    const delay = loading ? 0 : 180;
    const timeout = setTimeout(() => setShowSkeleton(loading), delay);
    return () => clearTimeout(timeout);
  }, [loading]);

  return (
    <div style={{ maxWidth: '1560px', margin: '0 auto', padding: '0 0 80px' }}>
      {/* Dynamic Hero */}
      <div style={{ padding: '0 24px', marginBottom: '52px' }}>
        <HeroSection titles={heroTitles} onNavigate={onNavigate} />
      </div>

      <div style={{ position: 'relative', minHeight: '3800px' }}>
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: showSkeleton ? 1 : 0 }}
          transition={{ duration: 0.28, ease: 'linear' }}
          style={{
            pointerEvents: showSkeleton ? 'auto' : 'none',
            position: showSkeleton ? 'relative' : 'absolute',
            inset: 0,
            width: '100%',
            willChange: 'opacity, transform',
            transform: 'translateZ(0)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {SKELETON_LABELS.map((label, index) => (
              <SkeletonRow key={`skeleton-${label}`} label={label} reverse={index % 2 === 1} count={12} />
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: showSkeleton ? 0 : 1 }}
          transition={{ duration: 0.28, ease: 'linear' }}
          style={{
            position: showSkeleton ? 'absolute' : 'relative',
            inset: 0,
            width: '100%',
            willChange: 'opacity, transform',
            transform: 'translateZ(0)',
          }}
        >
          <Suspense
            fallback={(
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {SKELETON_LABELS.map((label, index) => (
                  <SkeletonRow key={`lazy-fallback-${label}`} label={label} reverse={index % 2 === 1} count={12} />
                ))}
              </div>
            )}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {categories.map((category, index) => (
                <ScrollRow
                  key={category.id}
                  label={category.label}
                  items={category.titles}
                  onNavigate={onNavigate}
                  reverse={index % 2 === 1}
                />
              ))}
            </div>
          </Suspense>
        </motion.div>
      </div>
    </div>
  );
}
