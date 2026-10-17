-- SUPERSEDED by db/migrations/002_indexes.sql (idempotent). Kept for reference.
-- (removed) idx_titles_cine_score: cine_score was dropped by migration.sql, so this statement always failed.
CREATE INDEX IF NOT EXISTS idx_titles_release_date ON titles(release_date DESC);
CREATE INDEX IF NOT EXISTS idx_titles_genre ON titles(genre);
CREATE INDEX IF NOT EXISTS idx_title_credits_title_id ON title_credits(title_id);
CREATE INDEX IF NOT EXISTS idx_title_credits_person_id ON title_credits(person_id);
