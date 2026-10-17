-- 004 trigram indexes for substring search (OPTIONAL).
--
-- /api/titles?q= and /api/search use  title ILIKE '%text%'  and  people.name ILIKE '%text%',
-- which cannot use a B-tree index. For a few hundred rows a sequential scan is fine; apply this
-- when the catalog grows to tens of thousands of rows.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_titles_title_trgm ON titles USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_people_name_trgm  ON people USING gin (name gin_trgm_ops);
