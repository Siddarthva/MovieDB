import React from 'react';

export default function SkeletonCard({ width = 208, height = 400 }) {
  return (
    <div
      className="aspect-[2/3] bg-gray-800/50 animate-pulse rounded-lg"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'linear-gradient(120deg, rgba(32,32,32,0.95), rgba(58,58,58,0.7), rgba(32,32,32,0.95))',
        backgroundSize: '200% 100%',
        animation: 'row-skeleton-shimmer 1.6s linear infinite',
        flexShrink: 0,
        willChange: 'transform',
        transform: 'translateZ(0)',
      }}
    />
  );
}
