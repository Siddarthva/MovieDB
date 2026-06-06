import React from 'react';

export default function PageWrapper({ children }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#000000',
      color: '#ffffff',
      fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
      overflowX: 'hidden',
      paddingBottom: '80px',
    }}>
      {children}
    </div>
  );
}
