import React from 'react';

function getTone(rating) {
  const value = String(rating ?? '').trim().toUpperCase();

  if (value === 'G' || value === 'PG') {
    return {
      border: '#22c55e',
      glow: 'rgba(34,197,94,0.35)',
      text: '#dcfce7',
    };
  }

  if (value === 'PG-13') {
    return {
      border: '#facc15',
      glow: 'rgba(250,204,21,0.35)',
      text: '#fef9c3',
    };
  }

  if (value === 'R' || value === 'NC-17') {
    return {
      border: '#ef4444',
      glow: 'rgba(239,68,68,0.35)',
      text: '#fee2e2',
    };
  }

  return {
    border: 'rgba(255,255,255,0.4)',
    glow: 'rgba(255,255,255,0.18)',
    text: '#e5e7eb',
  };
}

export default function CensorNode({ rating }) {
  const label = String(rating ?? '').trim().toUpperCase() || 'NR';
  const tone = getTone(label);

  return (
    <div
      data-testid="censor-node"
      title={`Censor rating: ${label}`}
      className="w-10 h-10 rounded-full flex items-center justify-center border-2 text-xs font-bold font-mono bg-black/50 backdrop-blur-sm"
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '999px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `2px solid ${tone.border}`,
        fontSize: '11px',
        fontWeight: 800,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        color: tone.text,
        boxShadow: `0 0 0 1px rgba(255,255,255,0.08), 0 0 16px ${tone.glow}`,
      }}
    >
      {label}
    </div>
  );
}
