import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import PageWrapper from '../components/layout/PageWrapper';
import { api } from '../api';
import { renderRoute } from './routes';
import { fadeUp } from '../constants/designSystem';
import { setMetadata } from '../utils/seo';

export default function App() {
  const [history, setHistory] = useState([{ type: 'home', id: null }]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const currentView = history[history.length - 1];

  // ── SEO Management ──────────────────────────────────────────────────────────
  useEffect(() => {
    const caps = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const title = currentView.type === 'home' ? 'Home' : caps(currentView.type);
    setMetadata(title);
  }, [currentView.type]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(media.matches);
    update();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  useEffect(() => {
    let active = true;

    const checkHealth = async () => {
      try {
        await api.getHealth();
        if (active) setIsOffline(false);
      } catch {
        try {
          await api.getAllTitles();
          if (active) setIsOffline(false);
        } catch {
          if (active) setIsOffline(true);
        }
      }
    };

    checkHealth();
    const timer = setInterval(checkHealth, 8000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const navigate = (type, id) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsLoading(true);
    setTimeout(() => {
      setHistory(prev => [...prev, { type, id }]);
      setIsLoading(false);
    }, 300);
  };

  const goBack = () => {
    if (history.length > 1) setHistory(prev => prev.slice(0, -1));
  };

  const isDetailPage = currentView.type === 'title' || currentView.type === 'person';

  return (
    <PageWrapper>
      <Navbar onNavigate={navigate} currentRoute={currentView.type} />

      <main style={{ paddingTop: isMobile ? '72px' : '80px', paddingBottom: isMobile ? '92px' : '0' }}>
        {/* Back button — only on detail pages */}
        {isDetailPage && (
          <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 24px 0' }}>
            <motion.button
              whileHover={{ x: -3 }}
              whileTap={{ scale: 0.96 }}
              onClick={goBack}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                color: '#6b7280', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: '13px', fontWeight: 600, padding: '6px 0',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'white'}
              onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}
            >
              <ArrowLeft style={{ width: 14, height: 14 }} />
              Back
            </motion.button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {isOffline ? (
            <motion.div
              key="offline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', padding: '24px' }}
            >
              <div
                style={{
                  width: 'min(540px, 100%)',
                  borderRadius: '14px',
                  border: '1px solid rgba(251,191,36,0.35)',
                  background: 'linear-gradient(135deg, rgba(17,24,39,0.96), rgba(10,10,10,0.98))',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
                  padding: '24px',
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    margin: '0 0 8px',
                    fontSize: '12px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#fbbf24',
                    fontWeight: 700,
                  }}
                >
                  Connection Status
                </p>
                <h2 style={{ margin: '0 0 10px', fontSize: '26px', color: '#f9fafb' }}>System Offline - Reconnecting...</h2>
                <p style={{ margin: 0, color: '#9ca3af', fontSize: '14px', lineHeight: 1.6 }}>
                  The showcase cannot reach the database right now. We are retrying automatically every few seconds.
                </p>
              </div>
            </motion.div>
          ) : isLoading ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                minHeight: '60vh', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
              >
                <Loader2 style={{ width: 30, height: 30, color: '#6366f1' }} />
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key={`${currentView.type}-${currentView.id}`}
              variants={fadeUp}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {renderRoute(currentView, navigate)}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </PageWrapper>
  );
}
