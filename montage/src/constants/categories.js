export const CATEGORIES = [
  { id: "trending", title: "Trending Globally", filter: (t) => [...t].sort((a, b) => b.popularity - a.popularity) },
  { id: "anime", title: "Top Anime Worlds", filter: (t) => t.filter(x => x.type === 'anime') },
  { id: "series", title: "Masterpiece Series", filter: (t) => t.filter(x => x.type === 'series' || x.type === 'anime').sort((a, b) => (b.seriesMeta?.bingeScore || b.animeMeta?.bingeScore || 0) - (a.seriesMeta?.bingeScore || a.animeMeta?.bingeScore || 0)) },
  { id: "epics", title: "Cinematic Epics", filter: (t) => t.filter(x => x.type === 'movie' && (x.genreIds.includes("g2") || x.genreIds.includes("g1"))) }
];
