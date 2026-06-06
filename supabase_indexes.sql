CREATE INDEX idx_titles_cine_score ON titles(cine_score DESC);
CREATE INDEX idx_titles_release_date ON titles(release_date DESC);
CREATE INDEX idx_titles_genre ON titles(genre);
CREATE INDEX idx_title_credits_title_id ON title_credits(title_id);
CREATE INDEX idx_title_credits_person_id ON title_credits(person_id);
