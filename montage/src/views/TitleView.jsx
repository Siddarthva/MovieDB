
import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { getHybridRecommendations } from '../engine/recommendationEngine';
import TitleCard from '../components/ui/TitleCard';
import TitleHero from '../components/ui/TitleHero';
import { useCatalog } from '../hooks/useCatalog';
import { api } from '../api';

class TrailerModalBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    // Intentionally swallow trailer rendering errors to protect the page.
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            width: '100%',
            maxWidth: '64rem',
            borderRadius: '14px',
            border: '1px solid rgba(248,113,113,0.35)',
            background: 'rgba(10,10,10,0.95)',
            padding: '18px',
            color: '#fca5a5',
            textAlign: 'center',
          }}
        >
          Unable to load trailer preview for this title.
        </div>
      );
    }

    return this.props.children;
  }
}

function toEmbedTrailerUrl(trailerUrl) {
  if (!trailerUrl) return null;

  try {
    const parsed = new URL(trailerUrl);
    const host = parsed.hostname.toLowerCase();

    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      let videoId = '';

      if (host.includes('youtu.be')) {
        videoId = parsed.pathname.replace('/', '').trim();
      } else if (parsed.pathname === '/watch') {
        videoId = parsed.searchParams.get('v') ?? '';
      } else if (parsed.pathname.startsWith('/embed/')) {
        videoId = parsed.pathname.split('/embed/')[1] ?? '';
      } else if (parsed.pathname.startsWith('/shorts/')) {
        videoId = parsed.pathname.split('/shorts/')[1] ?? '';
      }

      videoId = videoId.split('/')[0]?.split('?')[0]?.trim();
      if (!videoId) return null;

      return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    }

    return trailerUrl;
  } catch {
    return trailerUrl;
  }
}

function getInitials(name) {
  const words = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'NA';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
}

function PersonAvatar({ imageUrl, name }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        loading="lazy"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    );
  }

  return (
    <div
      aria-label={`${name} initials avatar`}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '999px',
        display: 'grid',
        placeItems: 'center',
        background: 'radial-gradient(circle at 25% 15%, rgba(34,211,238,0.45), rgba(17,24,39,0.95) 62%)',
        color: '#f8fafc',
        fontWeight: 800,
        fontSize: '20px',
        letterSpacing: '0.04em',
      }}
    >
      {getInitials(name)}
    </div>
  );
}

export default function TitleView({ titleId, onNavigate }) {
  const { titles, people, loading: catalogLoading, error: catalogError } = useCatalog();
  const [title, setTitle] = useState(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState(null);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);

  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);

  useEffect(() => {
    let active = true;
    setDetailLoading(true);
    setDetailError(null);

    api.getById(titleId)
      .then((data) => {
        if (active) {
          setTitle(data);
          setDetailLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setDetailError(err);
          setDetailLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [titleId]);

  const loading = catalogLoading || detailLoading;
  const error = catalogError || detailError;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading Details...</div>;
  }

  if (error || !title) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">Error loading title data.</div>;
  }

  const trailer = title?.trailer ?? title?.media?.trailer ?? null;
  const trailerEmbedUrl = toEmbedTrailerUrl(trailer);
  const titlePeople = title?.people ?? {};
  const groupedCredits = title?.creditGroups ?? {};

  const castFromCredits = Array.isArray(groupedCredits.Cast) ? groupedCredits.Cast : [];
  const crewFromCredits = Array.isArray(groupedCredits.Crew) ? groupedCredits.Crew : [];

  const cast = castFromCredits.length
    ? castFromCredits
      .map((credit) => ({
        id: credit.personId,
        name: credit.name,
        image: credit.imageUrl,
      }))
      .filter((person) => person.id && person.name)
    : (titlePeople.castIds ?? []).map((id) => peopleById.get(id)).filter(Boolean);

  const crewCredits = crewFromCredits.length
    ? crewFromCredits
    : (title?.credits ?? []).filter((credit) => String(credit?.department ?? '').toLowerCase() !== 'cast');

  const rosterCredits = (() => {
    const fromTitleCredits = Array.isArray(title?.credits)
      ? title.credits.map((credit, index) => {
        const person = peopleById.get(credit?.personId);
        const name = credit?.name ?? person?.name ?? 'Unknown';
        return {
          key: `${credit?.personId ?? name}-${credit?.role ?? credit?.department ?? 'credit'}-${index}`,
          id: credit?.personId ?? person?.id ?? null,
          name,
          role: credit?.role ?? credit?.department ?? 'Cast',
          imageUrl: credit?.imageUrl ?? credit?.image_url ?? person?.image ?? person?.imageUrl ?? person?.image_url ?? null,
        };
      })
      : [];

    if (fromTitleCredits.length) {
      return fromTitleCredits;
    }

    return [
      ...cast.map((person, index) => ({
        key: `${person?.id ?? person?.name}-Cast-${index}`,
        id: person?.id ?? null,
        name: person?.name ?? 'Unknown',
        role: 'Cast',
        imageUrl: person?.image ?? person?.imageUrl ?? person?.image_url ?? null,
      })),
      ...crewCredits.map((credit, index) => {
        const person = peopleById.get(credit?.personId);
        const name = credit?.name ?? person?.name ?? 'Unknown';
        return {
          key: `${credit?.personId ?? name}-${credit?.role ?? 'Crew'}-${index}`,
          id: credit?.personId ?? person?.id ?? null,
          name,
          role: credit?.role ?? credit?.department ?? 'Crew',
          imageUrl: credit?.imageUrl ?? credit?.image_url ?? person?.image ?? person?.imageUrl ?? person?.image_url ?? null,
        };
      }),
    ];
  })();

  const recs = getHybridRecommendations(title, titles);
  const isShow = title?.type === 'show';

  return (
    <div className="bg-[#050505] min-h-screen text-white overflow-x-hidden pb-20">

      {/* ── Backdrop ─────────────────────────────────────── */}
      {/* Back button is rendered by App.jsx — do NOT add one here */}
      <div className="relative w-full h-[50vh] lg:h-[65vh]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${title?.backdrop ?? title?.media?.backdrop ?? title?.poster ?? title?.media?.poster ?? ''})`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />
      </div>

      {/* ── Hero Content (overlaps backdrop) ─────────────── */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 w-full relative z-10 -mt-32 md:-mt-48">
        <TitleHero title={title} onPlayTrailer={() => trailer && setIsTrailerOpen(true)} />
      </div>

      {/* ── Cast & Crew ───────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 w-full mt-16 mb-12" style={{ minHeight: '180px' }}>
        <h2 className="text-2xl font-bold text-white mb-6">Cast &amp; Crew</h2>
        {rosterCredits.length > 0 ? (
          <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide">
            {rosterCredits.map((credit) => (
              <div
                key={credit.key}
                className="flex flex-col items-center gap-2 min-w-[120px]"
                style={{ cursor: credit.id ? 'pointer' : 'default' }}
                onClick={() => credit.id && onNavigate('person', credit.id)}
              >
                <div
                  className="w-24 h-24 rounded-full overflow-hidden border border-white/15 bg-[#111827]"
                  style={{ display: 'grid', placeItems: 'center' }}
                >
                  <PersonAvatar imageUrl={credit.imageUrl} name={credit.name} />
                </div>
                <p className="text-sm font-bold text-white text-center m-0">{credit.name}</p>
                <p className="text-xs text-gray-400 text-center m-0">{credit.role}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No cast information available.</p>
        )}
      </div>

      {/* ── Similar Titles / Episodes ─────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 w-full mt-4 space-y-12">
        {recs.length > 0 && (
          <section>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', letterSpacing: '-0.02em', margin: '0 0 20px' }}>Similar Titles</h2>
            <div style={{ display: 'flex', gap: '18px', overflowX: 'auto', paddingBottom: '12px', scrollbarWidth: 'none' }}>
              {recs.map((r) => <TitleCard key={r.id} title={r} onNavigate={onNavigate} showMatchReason inCarousel={false} />)}
            </div>
          </section>
        )}

        {title?.episodes?.length > 0 && (
          <section>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>
              {isShow ? 'Top Episodes' : 'Episodes'}
            </p>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', letterSpacing: '-0.02em', margin: '0 0 16px' }}>Highlights</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(title?.episodes ?? []).map((ep, i) => (
                <motion.div key={ep.id} whileHover={{ background: 'rgba(255,255,255,0.06)' }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', transition: 'background 0.2s' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#4b5563', width: '20px', textAlign: 'right' }}>{i + 1}</span>
                    <p style={{ fontWeight: 700, color: 'white', margin: 0, fontSize: '14px' }}>{ep.title}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {ep.rating >= 9.9 && (
                      <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24', padding: '2px 7px', borderRadius: '4px' }}>Top</span>
                    )}
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#facc15' }}>{ep.rating}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>

      {isTrailerOpen && trailerEmbedUrl && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(0,0,0,0.9)',
            display: 'grid',
            placeItems: 'center',
            padding: '20px',
          }}
          onClick={() => setIsTrailerOpen(false)}
        >
          <button
            type="button"
            aria-label="Close trailer"
            onClick={() => setIsTrailerOpen(false)}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '40px',
              height: '40px',
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.22)',
              background: 'rgba(0,0,0,0.66)',
              color: 'white',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>

          <TrailerModalBoundary>
            <div
              style={{
                width: '100%',
                maxWidth: '64rem',
                aspectRatio: '16 / 9',
                borderRadius: '14px',
                overflow: 'hidden',
                boxShadow: '0 30px 80px rgba(0,0,0,0.75)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <iframe
                src={trailerEmbedUrl}
                title={`${title?.title} trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                style={{ width: '100%', height: '100%', border: 'none', background: '#000' }}
              />
            </div>
          </TrailerModalBoundary>
        </div>
      )}
    </div>
  );
}
