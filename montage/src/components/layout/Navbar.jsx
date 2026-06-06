import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Film, Tv, Clock, Library, Home } from 'lucide-react';
import Logo from '../ui/Logo';

const NAV = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'movies', label: 'Movies', icon: Film },
  { id: 'shows', label: 'Shows', icon: Tv },
  { id: 'upcoming', label: 'Upcoming', icon: Clock },
  { id: 'library', label: 'Library', icon: Library },
];

export default function Navbar({ onNavigate, currentRoute }) {
  const [isMobile, setIsMobile] = useState(false);

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

  const mobileTabs = NAV.filter((item) => item.id === 'home' || item.id === 'movies' || item.id === 'shows');

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'rgba(0,0,0,0.84)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            maxWidth: '1560px',
            margin: '0 auto',
            padding: isMobile ? '0 16px' : '0 24px',
            height: isMobile ? '56px' : '60px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Logo onClick={() => onNavigate('home', null)} style={{ marginRight: isMobile ? '0' : '16px' }} />

          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flex: 1 }}>
              {NAV.map((link) => {
                const active = currentRoute === link.id;
                const Icon = link.icon;
                return (
                  <motion.button
                    key={link.id}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onNavigate(link.id, null)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 13px',
                      borderRadius: '8px',
                      background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                      border: 'none',
                      color: active ? 'white' : '#6b7280',
                      fontSize: '13px',
                      fontWeight: active ? 700 : 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      letterSpacing: '0.01em',
                    }}
                    onMouseEnter={(event) => {
                      if (!active) {
                        event.currentTarget.style.color = '#d1d5db';
                        event.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                      }
                    }}
                    onMouseLeave={(event) => {
                      if (!active) {
                        event.currentTarget.style.color = '#6b7280';
                        event.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <Icon style={{ width: 14, height: 14 }} />
                    {link.label}
                  </motion.button>
                );
              })}
            </div>
          )}

          <div style={{ flex: 1 }} />

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate('search', null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '0' : '7px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              padding: isMobile ? '8px' : '7px 14px',
              color: '#9ca3af',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)';
              event.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              event.currentTarget.style.color = '#9ca3af';
            }}
          >
            <Search style={{ width: 14, height: 14 }} />
            {!isMobile && 'Search'}
          </motion.button>
        </div>
      </nav>

      {isMobile && (
        <nav
          style={{
            position: 'fixed',
            left: '12px',
            right: '12px',
            bottom: '10px',
            zIndex: 105,
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(8,8,8,0.9)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            padding: '7px 8px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '6px',
          }}
        >
          {mobileTabs.map((item) => {
            const Icon = item.icon;
            const active = currentRoute === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id, null)}
                style={{
                  border: 'none',
                  background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: active ? '#f8fafc' : '#9ca3af',
                  borderRadius: '10px',
                  padding: '7px 4px 6px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  fontSize: '11px',
                  fontWeight: active ? 700 : 600,
                  cursor: 'pointer',
                }}
              >
                <Icon style={{ width: 15, height: 15 }} />
                {item.label}
              </button>
            );
          })}
        </nav>
      )}
    </>
  );
}
