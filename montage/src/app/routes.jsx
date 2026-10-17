import React, { Suspense, lazy, useCallback } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { pathFor } from './paths';

const HomeView = lazy(() => import('../views/HomeView'));
const BrowseView = lazy(() => import('../views/BrowseView'));
const UpcomingView = lazy(() => import('../views/UpcomingView'));
const ReleasedView = lazy(() => import('../views/ReleasedView'));
const LibraryView = lazy(() => import('../views/LibraryView'));
const SearchView = lazy(() => import('../views/SearchView'));
const TitleView = lazy(() => import('../views/TitleView'));
const PersonView = lazy(() => import('../views/PersonView'));

/** `onNavigate(type, id)` is the navigation contract the views were written against; it now pushes real URLs. */
export function useAppNavigate() {
  const navigate = useNavigate();
  return useCallback((type, id) => navigate(pathFor(type, id)), [navigate]);
}

function TitleRoute() {
  const { id } = useParams();
  return <TitleView key={id} titleId={id} onNavigate={useAppNavigate()} />;
}

function PersonRoute() {
  const { id } = useParams();
  return <PersonView key={id} personId={id} onNavigate={useAppNavigate()} />;
}

const withNav = (View, extra = {}) => function Routed() {
  return <View onNavigate={useAppNavigate()} {...extra} />;
};

const Home = withNav(HomeView);
const Movies = withNav(BrowseView, { type: 'movie' });
const Shows = withNav(BrowseView, { type: 'show' });
const Upcoming = withNav(UpcomingView);
const Released = withNav(ReleasedView);
const Library = withNav(LibraryView);
const Search = withNav(SearchView);

function PageFallback() {
  return <div role="status" aria-live="polite" className="page" style={{ minHeight: '60vh' }}><span className="sr-only">Loading…</span><div className="skeleton" style={{ height: 320 }} /></div>;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/shows" element={<Shows />} />
        <Route path="/upcoming" element={<Upcoming />} />
        <Route path="/released" element={<Released />} />
        <Route path="/library" element={<Library />} />
        <Route path="/search" element={<Search />} />
        <Route path="/title/:id" element={<TitleRoute />} />
        <Route path="/person/:id" element={<PersonRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
