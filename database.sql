-- Drop tables if they exist to clean setup
DROP TABLE IF EXISTS title_credits CASCADE;
DROP TABLE IF EXISTS title_genres CASCADE;
DROP TABLE IF EXISTS titles CASCADE;
DROP TABLE IF EXISTS people CASCADE;
DROP TABLE IF EXISTS genres CASCADE;

-- 1. Create Genres table
CREATE TABLE genres (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

-- 2. Create People table
CREATE TABLE people (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    image TEXT,
    image_url TEXT,
    roles TEXT[]
);

-- 3. Create Titles table
CREATE TABLE titles (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    year INTEGER,
    release_date TEXT,
    poster TEXT,
    backdrop TEXT,
    trailer TEXT,
    synopsis TEXT,
    runtime TEXT,
    genre TEXT,
    censor_rating TEXT
);

-- 4. Create Title Genres relationship table
CREATE TABLE title_genres (
    title_id TEXT REFERENCES titles(id) ON DELETE CASCADE,
    genre_id TEXT REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (title_id, genre_id)
);

-- 5. Create Title Credits relationship table
CREATE TABLE title_credits (
    title_id TEXT REFERENCES titles(id) ON DELETE CASCADE,
    person_id TEXT REFERENCES people(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    department TEXT,
    PRIMARY KEY (title_id, person_id, role)
);

-- 6. Create Indexes for performance
CREATE INDEX idx_titles_release_date ON titles(release_date DESC);
CREATE INDEX idx_titles_type_year ON titles(type, year DESC);
CREATE INDEX idx_title_genres_genre_id ON title_genres(genre_id);
CREATE INDEX idx_title_credits_title_id ON title_credits(title_id);
CREATE INDEX idx_title_credits_person_id ON title_credits(person_id);

-- 7. Disable Row Level Security (RLS) to allow API interaction without complex auth
ALTER TABLE genres DISABLE ROW LEVEL SECURITY;
ALTER TABLE people DISABLE ROW LEVEL SECURITY;
ALTER TABLE titles DISABLE ROW LEVEL SECURITY;
ALTER TABLE title_genres DISABLE ROW LEVEL SECURITY;
ALTER TABLE title_credits DISABLE ROW LEVEL SECURITY;
