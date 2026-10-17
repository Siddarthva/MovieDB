import React, { useEffect } from 'react';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import { MotionConfig, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import PageWrapper from '../components/layout/PageWrapper';
import AppRoutes from './routes';
import { fadeUp } from '../constants/designSystem';
import { setMetadata } from '../utils/seo';

const SECTION_TITLES = { '/': 'Home', '/movies': 'Movies', '/shows': 'TV Shows', '/upcoming': 'Upcoming', '/released': 'Released', '/library': 'Library', '/search': 'Search' };

class RouteErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prev) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="page" style={{ textAlign: 'center', paddingTop: 'var(--space-8)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)' }}>This page failed to render</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 'var(--space-3) 0 var(--space-5)' }}>Reload the page or go back to the home page.</p>
        <a className="btn btn--primary" href="/">Go home</a>
      </div>
    );
  }
}

function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDetail = location.pathname.startsWith('/title/') || location.pathname.startsWith('/person/');

  useEffect(() => {
    window.scrollTo({ top: 0 });
    const section = SECTION_TITLES[location.pathname];
    if (section) setMetadata(section);
  }, [location.pathname]);

  const goBack = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'));

  return (
    <PageWrapper>
      <a className="skip-link" href="#main">Skip to content</a>
      <Navbar />
      <main id="main" tabIndex={-1} style={{ paddingTop: 'calc(var(--nav-height) + var(--space-3))' }}>
        {isDetail && (
          <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: 'var(--space-3) var(--gutter) 0' }}>
            <button type="button" className="btn" onClick={goBack} style={{ border: 'none', background: 'none', color: 'var(--text-secondary)', padding: 0 }}>
              <ArrowLeft aria-hidden="true" style={{ width: 14, height: 14 }} /> Back
            </button>
          </div>
        )}
        <RouteErrorBoundary resetKey={location.pathname}>
          <motion.div key={location.pathname} variants={fadeUp} initial="initial" animate="animate">
            <AppRoutes />
          </motion.div>
        </RouteErrorBoundary>
      </main>
    </PageWrapper>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      {/* "user" honours the OS reduced-motion setting for every framer-motion animation */}
      <MotionConfig reducedMotion="user">
        <Shell />
      </MotionConfig>
    </BrowserRouter>
  );
}
