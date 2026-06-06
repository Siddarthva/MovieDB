import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Film, Tv, User } from 'lucide-react';
import SafeImage from '../components/ui/SafeImage';
import { useCatalog } from '../hooks/useCatalog';

// Rank: startsWith > includes
function rankResults(arr, query, keyFn) {
  const q = query.toLowerCase();
  return arr
    .filter(item => keyFn(item).toLowerCase().includes(q))
    .sort((a, b) => {
      const aStarts = keyFn(a).toLowerCase().startsWith(q);
      const bStarts = keyFn(b).toLowerCase().startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    });
}

function TypeIcon({ type, style }) {
  const Icon = type === 'show' ? Tv : Film;
  const color = type === 'show' ? '#38bdf8' : '#818cf8';
  return <Icon style={{ ...style, color }} />;
}

export default function SearchView({ onNavigate }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const { titles, people } = useCatalog();

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return { titles: [], people: [] };
    return {
      titles: rankResults(titles, query, t => t.title),
      people: rankResults(people, query, p => p.name),
    };
  }, [query, titles, people]);

  const hasResults = results.titles.length > 0 || results.people.length > 0;
  const isEmpty = query.trim().length > 0 && !hasResults;

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 24px 80px' }}>

      {/* Search input */}
      <div style={{ position: 'relative', marginBottom: '40px' }}>
        <Search style={{
          position: 'absolute', left: '20px', top: '50%',
          transform: 'translateY(-50%)',
          width: 22, height: 22, color: '#6366f1',
          pointerEvents: 'none',
        }} />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search movies, shows, people..."
          style={{
            width: '100%',
            padding: '20px 20px 20px 56px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            fontSize: '18px',
            fontWeight: 600,
            color: 'white',
            outline: 'none',
            boxShadow: '0 0 0 0 rgba(99,102,241,0)',
            transition: 'border-color 0.3s, box-shadow 0.3s',
            boxSizing: 'border-box',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)';
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.boxShadow = '0 0 0 0 rgba(99,102,241,0)';
          }}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{
              position: 'absolute', right: '16px', top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.08)',
              border: 'none', borderRadius: '8px',
              padding: '4px 10px', color: '#9ca3af',
              cursor: 'pointer', fontSize: '12px', fontWeight: 600,
            }}
          >
            Clear
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* Empty state */}
        {!query.trim() && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ textAlign: 'center', paddingTop: '60px', color: '#4b5563' }}
          >
            <Search style={{ width: 48, height: 48, margin: '0 auto 16px', opacity: 0.3 }} />
            <p style={{ fontSize: '16px', fontWeight: 600, color: '#6b7280' }}>
              Start typing to search the universe
            </p>
          </motion.div>
        )}

        {/* No results */}
        {isEmpty && (
          <motion.div
            key="no-results"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ textAlign: 'center', paddingTop: '60px' }}
          >
            <p style={{ fontSize: '16px', fontWeight: 600, color: '#6b7280' }}>
              No results for "<span style={{ color: 'white' }}>{query}</span>"
            </p>
          </motion.div>
        )}

        {/* Results */}
        {hasResults && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}
          >
            {/* Titles */}
            {results.titles.length > 0 && (
              <section>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  marginBottom: '16px',
                  paddingBottom: '10px',
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                }}>
                  <Film style={{ width: 13, height: 13, color: '#6b7280' }} />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Titles
                  </span>
                  <span style={{
                    fontSize: '10px', fontWeight: 700,
                    background: 'rgba(99,102,241,0.15)',
                    color: '#818cf8', padding: '1px 7px',
                    borderRadius: '100px',
                  }}>
                    {results.titles.length}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {results.titles.map(r => (
                    <motion.div
                      key={r.id}
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => onNavigate('title', r.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '16px',
                        padding: '14px 16px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '14px', cursor: 'pointer',
                        transition: 'border-color 0.2s, background 0.2s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                      }}
                    >
                      <SafeImage
                        src={r.media?.poster}
                        alt={r.title}
                        type="poster"
                        style={{
                          width: '52px', height: '78px',
                          borderRadius: '8px',
                          flexShrink: 0,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: '14px', fontWeight: 700,
                          color: 'white', marginBottom: '4px',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {r.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <TypeIcon type={r.type} style={{ width: 12, height: 12 }} />
                          <span style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'capitalize' }}>
                            {r.year} · {r.type}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* People */}
            {results.people.length > 0 && (
              <section>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  marginBottom: '16px',
                  paddingBottom: '10px',
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                }}>
                  <User style={{ width: 13, height: 13, color: '#6b7280' }} />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    People
                  </span>
                  <span style={{
                    fontSize: '10px', fontWeight: 700,
                    background: 'rgba(99,102,241,0.15)',
                    color: '#818cf8', padding: '1px 7px',
                    borderRadius: '100px',
                  }}>
                    {results.people.length}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {results.people.map(r => (
                    <motion.div
                      key={r.id}
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => onNavigate('person', r.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '16px',
                        padding: '14px 16px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '14px', cursor: 'pointer',
                        transition: 'border-color 0.2s, background 0.2s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                      }}
                    >
                      <SafeImage
                        src={r.image}
                        alt={r.name}
                        type="poster"
                        style={{
                          width: '52px', height: '52px',
                          borderRadius: '50%',
                          flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)',
                        }}
                      />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '3px' }}>
                          {r.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                          {r.roles.join(' · ')}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
