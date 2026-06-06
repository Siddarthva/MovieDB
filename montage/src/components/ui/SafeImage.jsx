import React, { useState, forwardRef } from 'react';

const SafeImage = forwardRef(({ src, alt, type = 'poster', style, className, ...props }, ref) => {
  const [error, setError] = useState(false);

  if (error || !src) {
    const isPoster = type === 'poster';
    const titleText = (alt || '').trim() || 'Untitled';

    return (
      <div
        role="img"
        aria-label={alt || `Missing ${isPoster ? 'Poster' : 'Backdrop'}`}
        className={className}
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          color: '#d1d5db',
          background: isPoster
            ? 'radial-gradient(circle at 25% 15%, rgba(34,211,238,0.35), rgba(16,24,39,0.96) 62%)'
            : 'linear-gradient(135deg, rgba(8,47,73,0.92), rgba(17,24,39,0.96))',
          border: '1px solid rgba(255,255,255,0.08)',
          ...style,
        }}
      >
        <div style={{ padding: '14px 10px' }}>
          <p style={{ margin: 0, fontSize: isPoster ? '14px' : '16px', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#22d3ee' }}>
            Montage
          </p>
          <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#e5e7eb', fontWeight: 700 }}>
            {titleText}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: '10px', color: '#9ca3af', letterSpacing: '0.04em' }}>
            No {isPoster ? 'poster' : 'backdrop'} in database
          </p>
        </div>
      </div>
    );
  }

  return (
    <img
      ref={ref}
      src={src}
      alt={alt || ''}
      onError={() => setError(true)}
      loading="lazy"
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        ...style
      }}
      className={className}
      {...props}
    />
  );
});

export default SafeImage;
