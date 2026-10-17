import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Search, Film, Tv, Clock, Library, Home } from 'lucide-react';
import Logo from '../ui/Logo';

const NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/movies', label: 'Movies', icon: Film },
  { to: '/shows', label: 'Shows', icon: Tv },
  { to: '/upcoming', label: 'Upcoming', icon: Clock },
  { to: '/library', label: 'Library', icon: Library },
];

const linkStyle = ({ isActive }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 13px',
  borderRadius: 'var(--radius-md)',
  background: isActive ? 'var(--surface-3)' : 'transparent',
  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
  fontSize: 'var(--text-sm)',
  fontWeight: isActive ? 700 : 600,
  textDecoration: 'none',
});

export default function Navbar() {
  return (
    <>
      <header
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border-muted)',
        }}
      >
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: '0 var(--gutter)', height: 'var(--nav-height)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Link to="/" aria-label="Montage home" style={{ display: 'inline-flex', marginRight: 'var(--space-4)' }}>
            <Logo />
          </Link>

          <nav aria-label="Primary" className="nav-desktop" style={{ display: 'flex', gap: 2, flex: 1 }}>
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} style={linkStyle}>
                <Icon aria-hidden="true" style={{ width: 14, height: 14 }} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div style={{ flex: 1 }} className="nav-spacer" />

          <Link to="/search" className="btn" aria-label="Search" style={{ textDecoration: 'none' }}>
            <Search aria-hidden="true" style={{ width: 14, height: 14 }} />
            <span className="nav-search-label">Search</span>
          </Link>
        </div>
      </header>

      <nav aria-label="Primary mobile" className="nav-mobile">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="nav-mobile__item">
            <Icon aria-hidden="true" style={{ width: 17, height: 17 }} />
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
