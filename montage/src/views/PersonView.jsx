import React from 'react';
import { motion } from 'framer-motion';
import TitleCard from '../components/ui/TitleCard';
import { useMemo } from 'react';
import { useCatalog } from '../hooks/useCatalog';

export default function PersonView({ personId, onNavigate }) {
  const { people, titles, loading } = useCatalog();
  const person = useMemo(() => people.find((item) => item.id === personId) ?? null, [people, personId]);
  const filmography = useMemo(() => titles.filter((title) =>
    title.people?.directorId === personId ||
    title.people?.composerId === personId ||
    (title.people?.writerIds ?? []).includes(personId) ||
    (title.people?.castIds ?? []).includes(personId)
  ).sort((a, b) => b.year - a.year), [titles, personId]);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px', color: '#6b7280' }}>Loading person...</div>
  );

  if (!person) return (
    <div style={{ textAlign: 'center', padding: '80px', color: '#6b7280' }}>
      Person not found.
    </div>
  );

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 24px 80px' }}>
      {/* Profile card */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px', padding: '40px 48px',
        marginBottom: '48px',
        display: 'flex', gap: '40px', alignItems: 'center',
        boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
      }}>
        <motion.img
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          src={person.image}
          alt={person.name}
          loading="lazy"
          style={{
            width: '160px', height: '160px',
            borderRadius: '50%', objectFit: 'cover',
            border: '2px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
            flexShrink: 0,
          }}
        />
        <div>
          <h1 style={{
            fontSize: 'clamp(32px, 4vw, 56px)',
            fontWeight: 900, color: 'white',
            letterSpacing: '-0.03em',
            margin: '0 0 8px',
          }}>
            {person.name}
          </h1>
          <p style={{ color: '#6366f1', fontSize: '13px', fontWeight: 600, margin: '0 0 24px' }}>
            {person.roles.join(' · ')}
          </p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '12px', padding: '14px 24px',
            }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                Graph Credits
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'white', lineHeight: 1 }}>
                {filmography.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filmography */}
      <div>
        <h2 style={{
          fontSize: '20px', fontWeight: 700, color: 'white',
          letterSpacing: '-0.02em', margin: '0 0 24px',
        }}>
          Career Arc
        </h2>
        {filmography.length === 0 ? (
          <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No entries in the knowledge graph yet.</p>
        ) : (
          <div style={{
            display: 'flex', gap: '20px',
            overflowX: 'auto', paddingBottom: '24px',
            paddingTop: '8px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}>
            {filmography.map(t => (
              <TitleCard key={t.id} title={t} onNavigate={onNavigate} inCarousel={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
