/** Single place that maps view names (used by `onNavigate(type, id)`) to URLs. */
export function pathFor(type, id) {
  switch (type) {
    case 'movies': return '/movies';
    case 'shows': return '/shows';
    case 'upcoming': return '/upcoming';
    case 'released': return '/released';
    case 'library': return '/library';
    case 'search': return id ? `/search?q=${encodeURIComponent(id)}` : '/search';
    case 'title': return `/title/${encodeURIComponent(id)}`;
    case 'person': return `/person/${encodeURIComponent(id)}`;
    default: return '/';
  }
}
