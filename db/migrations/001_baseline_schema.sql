-- 001 baseline schema (non-destructive, idempotent).
-- Mirrors database.sql without the DROP statements, so it is safe on an existing database:
-- existing tables and data are left untouched.

CREATE TABLE IF NOT EXISTS genres (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS people (
    id        TEXT PRIMARY KEY,
    name      TEXT NOT NULL,
    image     TEXT,
    image_url TEXT,
    roles     TEXT[]
);

CREATE TABLE IF NOT EXISTS titles (
    id             TEXT PRIMARY KEY,
    type           TEXT NOT NULL,
    title          TEXT NOT NULL,
    year           INTEGER,
    release_date   TEXT,
    poster         TEXT,
    backdrop       TEXT,
    trailer        TEXT,
    synopsis       TEXT,
    runtime        TEXT,
    genre          TEXT,
    censor_rating  TEXT
);

CREATE TABLE IF NOT EXISTS title_genres (
    title_id TEXT REFERENCES titles(id) ON DELETE CASCADE,
    genre_id TEXT REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (title_id, genre_id)
);

CREATE TABLE IF NOT EXISTS title_credits (
    title_id   TEXT REFERENCES titles(id) ON DELETE CASCADE,
    person_id  TEXT REFERENCES people(id) ON DELETE CASCADE,
    role       TEXT NOT NULL,
    department TEXT,
    PRIMARY KEY (title_id, person_id, role)
);

-- Columns older deployments may lack (no-ops when present).
ALTER TABLE titles ADD COLUMN IF NOT EXISTS censor_rating TEXT;
ALTER TABLE titles ADD COLUMN IF NOT EXISTS genre TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE title_credits ADD COLUMN IF NOT EXISTS department TEXT;

-- NOTE: this migration is purely additive. The experimental columns (cine_score, dna_*, audience_score)
-- are not dropped here; if they still exist, run the root migration.sql deliberately after taking a backup.
