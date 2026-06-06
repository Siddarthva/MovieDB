import React from 'react';
import logoImg from '../../assets/Logo.png';

/**
 * Standardized Logo component for brand consistency across the platform.
 * Supports dynamic sizing, standardized fallbacks, and accessibility.
 * 
 * @param {('sm' | 'md' | 'lg')} size - The sizing preset (default: 'md')
 * @param {string} className - Optional Tailwind or custom classes
 * @param {function} onClick - Optional click handler for navigation
 */
const Logo = ({ className = '', onClick, style }) => {
  return (
    <div 
      className={`relative inline-block ${className}`}
      onClick={onClick}
      style={{ 
        cursor: onClick ? 'pointer' : 'default',
        padding: '2px',
        userSelect: 'none',
        flexShrink: 0,
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        ...style
      }}
      aria-label="CinePulse Logo"
    >
      <img
        src={logoImg}
        alt="Montage logo"
        style={{
          height: '24px',
          width: 'auto',
          objectFit: 'contain',
          display: 'block',
          opacity: 0.9,
          filter: 'brightness(0.85) saturate(0.85) contrast(1.05)',
          transition: 'filter 0.3s ease',
        }}
        onMouseEnter={e => {
          if (onClick) e.currentTarget.style.filter = 'brightness(1) saturate(1) contrast(1.05)';
        }}
        onMouseLeave={e => {
          if (onClick) e.currentTarget.style.filter = 'brightness(0.85) saturate(0.85) contrast(1.05)';
        }}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          const text = document.createElement('span');
          text.style.cssText = 'font-weight: 800; font-size: 14px; color: #4b5563; letter-spacing: -0.02em;';
          text.innerText = 'CinePulse';
          e.currentTarget.parentElement.appendChild(text);
        }}
      />
    </div>
  );
};


export default Logo;
