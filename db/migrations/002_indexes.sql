-- 002 indexes (idempotent). Each index maps to a query the API actually issues.

-- Home rows, sort=year_desc / release_desc on /api/titles
CREATE INDEX IF NOT EXISTS idx_titles_release_date ON titles (release_date DESC);
-- /api/titles?type=…&sort=year_desc
CREATE INDEX IF NOT EXISTS idx_titles_type_year ON titles (type, year DESC);
-- /api/titles?genre=… (join) and related-titles lookup by genre
CREATE INDEX IF NOT EXISTS idx_title_genres_genre_id ON title_genres (genre_id);
-- Title detail credits, related-titles credit lookup, person filmography
CREATE INDEX IF NOT EXISTS idx_title_credits_title_id ON title_credits (title_id);
CREATE INDEX IF NOT EXISTS idx_title_credits_person_id ON title_credits (person_id);
