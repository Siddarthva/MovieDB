import React, { useMemo, useState } from 'react';
import { Calendar } from 'lucide-react';
import { getStatus, formatReleaseDate, groupByMonth } from '../engine/timeEngine';
import { getMostAnticipated } from '../engine/anticipationEngine';
import TitleCard from '../components/ui/TitleCard';
import { useTitles } from '../hooks/useTitles';

function CineCalendar({ titles, onNavigate }) {
  const groups = useMemo(() => groupByMonth(titles), [titles]);
  if (!groups.length) return (
    <p style={{ color: '#4b5563', textAlign: 'center', padding: '60px 0' }}>No upcoming releases to display.</p>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '44px' }}>
      {groups.map(g => (
        <div key={g.key}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <Calendar style={{ width: 15, height: 15, color: '#6366f1' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'white', margin: 0, letterSpacing: '-0.01em' }}>
              {g.label}
            </h3>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ fontSize: '11px', color: '#4b5563', fontWeight: 600 }}>
              {g.titles.length} {g.titles.length === 1 ? 'title' : 'titles'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '18px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
            {g.titles.map(t => (
              <div key={t.id} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <TitleCard title={t} onNavigate={onNavigate} inCarousel={false} variant="simple" />
                <p style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', margin: 0, textAlign: 'center', padding: '0 4px' }}>
                  {formatReleaseDate(t)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function UpcomingView({ onNavigate }) {
  const { data: titles } = useTitles();
  const upcoming = useMemo(() => {
    const filtered = titles.filter(t => getStatus(t) === 'upcoming');
    // Sort by nearest release date first (ascending)
    return filtered.sort((a, b) => {
      const dateA = new Date((a.releaseDate || `${a.year}-01-01`) + 'T00:00:00Z');
      const dateB = new Date((b.releaseDate || `${b.year}-01-01`) + 'T00:00:00Z');
      return dateA - dateB;
    });
  }, [titles]);

  const anticipated = useMemo(() => getMostAnticipated(upcoming), [upcoming]);
  const [tab, setTab] = useState('grid');

  return (
    <div style={{ maxWidth: '1220px', margin: '0 auto', padding: '24px 28px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <p style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>
          On the Horizon
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 900, color: 'white', margin: 0, letterSpacing: '-0.03em' }}>
            Upcoming
          </h1>
          {upcoming.length > 0 && (
            <span style={{
              fontSize: '11px', fontWeight: 700,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#9ca3af', padding: '3px 10px', borderRadius: '20px',
            }}>
              {upcoming.length}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '32px' }}>
        {[{ id: 'grid', label: 'Most Anticipated' }, { id: 'calendar', label: 'Release Calendar' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 18px', borderRadius: '8px', cursor: 'pointer',
            border: tab === t.id ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.07)',
            background: tab === t.id ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
            color: tab === t.id ? '#818cf8' : '#6b7280',
            fontWeight: 700, fontSize: '13px', transition: 'all 0.2s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'grid' ? (
        upcoming.length === 0 ? (
          <p style={{ color: '#4b5563', textAlign: 'center', padding: '80px 0' }}>No upcoming titles.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {anticipated.map((t) => (
              <TitleCard key={t.id} title={t} onNavigate={onNavigate} variant="simple" />
            ))}
          </div>
        )
      ) : (
        <CineCalendar titles={upcoming} onNavigate={onNavigate} />
      )}
    </div>
  );
}
