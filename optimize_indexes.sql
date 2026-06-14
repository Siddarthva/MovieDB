-- Optimize title lookups by type and release/year
CREATE INDEX IF NOT EXISTS idx_titles_type_year ON titles(type, year DESC);
CREATE INDEX IF NOT EXISTS idx_titles_release_date ON titles(release_date DESC);

-- Optimize join tables reverse lookups
CREATE INDEX IF NOT EXISTS idx_title_genres_genre_id ON title_genres(genre_id);
CREATE INDEX IF NOT EXISTS idx_title_credits_person_id ON title_credits(person_id);
