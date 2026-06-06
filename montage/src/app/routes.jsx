import React, { Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

// ── Lazy Load All Major Views ──────────────────────────────────────────────
const HomeView    = lazy(() => import('../views/HomeView'));
const MoviesView  = lazy(() => import('../views/MoviesView'));
const ShowsView   = lazy(() => import('../views/ShowsView'));
const UpcomingView = lazy(() => import('../views/UpcomingView'));
const ReleasedView = lazy(() => import('../views/ReleasedView'));
const LibraryView  = lazy(() => import('../views/LibraryView'));
const SearchView  = lazy(() => import('../views/SearchView'));
const TitleView   = lazy(() => import('../views/TitleView'));
const PersonView  = lazy(() => import('../views/PersonView'));

/** Loading state for Suspense boundaries */
const LoadingSpinner = () => (
  <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}>
      <Loader2 style={{ width: 30, height: 30, color: 'var(--accent)' }} />
    </motion.div>
  </div>
);

/** Unified route renderer with Suspense boundary for lazy-loaded components. */
export function renderRoute(view, navigate) {
  const props = { onNavigate: navigate };

  const getComponent = () => {
    switch (view.type) {
      case 'home':     return <HomeView {...props} />;
      case 'movies':   return <MoviesView {...props} />;
      case 'shows':    return <ShowsView {...props} />;
      case 'upcoming': return <UpcomingView {...props} />;
      case 'released': return <ReleasedView {...props} />;
      case 'library':  return <LibraryView {...props} />;
      case 'search':   return <SearchView {...props} />;
      case 'title':    return <TitleView titleId={view.id} {...props} />;
      case 'person':   return <PersonView personId={view.id} {...props} />;
      default:         return <HomeView {...props} />;
    }
  };

  return (
    <Suspense fallback={<LoadingSpinner />}>
      {getComponent()}
    </Suspense>
  );
}
