// Recommendation engine — DNA similarity + genre overlap + collaboration graph
import { computeDNASimilarity } from './dnaEngine';

export function getHybridRecommendations(title, allTitles, limit = 6) {
  const titleGenres = title.classification?.genres ?? [];
  const titlePeople = title.people ?? {};

  return allTitles
    .filter(t => t.id !== title.id)
    .map(candidate => {
      const candidateGenres = candidate.classification?.genres ?? [];
      const candidatePeople = candidate.people ?? {};

      const dnaScore   = computeDNASimilarity(title.dna, candidate.dna);
      const genreScore = titleGenres.filter(g => candidateGenres.includes(g)).length /
                         Math.max(titleGenres.length, 1);
      const collab     =
        (titlePeople.directorId && titlePeople.directorId === candidatePeople.directorId ? 0.3 : 0) +
        (titlePeople.castIds?.some(id => candidatePeople.castIds?.includes(id)) ? 0.2 : 0);

      const total = dnaScore * 0.5 + genreScore * 0.3 + collab;

      const matchReason =
        dnaScore   > 0.8 ? `${Math.round(dnaScore * 100)}% DNA match` :
        genreScore > 0.5 ? 'Shared genre DNA' :
        collab     > 0   ? 'Same creative team' :
                           `${Math.round(total * 100)}% match`;

      return { ...candidate, matchScore: total, matchReason };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}
