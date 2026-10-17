import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import TitleCard from './TitleCard';

/**
 * Horizontally scrolling row of title cards. Native scrolling (touch, wheel, keyboard) with scroll-snap;
 * nothing auto-moves, so it is safe for reduced-motion users and screen magnifiers.
 */
export default function ScrollRow({ label, items, onNavigate, method }) {
  const scroller = useRef(null);
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!list.length) return null;

  const scrollBy = (direction) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <section aria-label={label}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-3)', padding: '0 var(--gutter)', marginBottom: 'var(--space-2)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-lg)' }}>{label}</h2>
          {method && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{method}</p>}
        </div>
        <div className="hide-touch" style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button type="button" className="btn" aria-label={`Scroll ${label} left`} onClick={() => scrollBy(-1)} style={{ minHeight: 32, padding: '0 8px' }}><ChevronLeft aria-hidden="true" style={{ width: 16, height: 16 }} /></button>
          <button type="button" className="btn" aria-label={`Scroll ${label} right`} onClick={() => scrollBy(1)} style={{ minHeight: 32, padding: '0 8px' }}><ChevronRight aria-hidden="true" style={{ width: 16, height: 16 }} /></button>
        </div>
      </div>
      <div ref={scroller} className="row-scroller" role="list" tabIndex={-1}>
        {list.map((title) => (
          <div key={title.id} role="listitem" style={{ flexShrink: 0 }}>
            <TitleCard title={title} onNavigate={onNavigate} />
          </div>
        ))}
      </div>
    </section>
  );
}
