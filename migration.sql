-- Drop index depending on cine_score
DROP INDEX IF EXISTS idx_titles_cine_score;

-- Drop DNA and Hype columns from titles table
ALTER TABLE titles 
DROP COLUMN IF EXISTS cine_score,
DROP COLUMN IF EXISTS audience_score,
DROP COLUMN IF EXISTS dna_intensity,
DROP COLUMN IF EXISTS dna_emotion,
DROP COLUMN IF EXISTS dna_complexity,
DROP COLUMN IF EXISTS dna_pace,
DROP COLUMN IF EXISTS dna_darkness,
DROP COLUMN IF EXISTS dna_spectacle;

-- Optimize title lookups by release date
CREATE INDEX IF NOT EXISTS idx_titles_release_date ON titles(release_date DESC);
