import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';

import { GENRES } from "./data/genres.js";
import { PEOPLE } from "./data/people.js";
import { MOVIES } from "./data/movies.js";
import { SHOWS } from "./data/shows.js";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: Supabase URL or Key is missing. Check backend/.env.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const asStringOrNull = (value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
};

const asNumberOrNull = (value) => (typeof value === "number" && Number.isFinite(value) ? value : null);

const asArrayOrNull = (value) => (Array.isArray(value) ? value : null);

const titleCaseFromSnake = (value) =>
  String(value)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const chunk = (arr, size = 500) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
};

async function upsertInChunks({ table, rows, onConflict }) {
  if (!rows.length) {
    console.log(`[${table}] nothing to upsert`);
    return;
  }

  const parts = chunk(rows, 500);
  let inserted = 0;

  for (let i = 0; i < parts.length; i += 1) {
    const payload = parts[i];
    const { error } = await supabase
      .from(table)
      .upsert(payload, { onConflict, ignoreDuplicates: false });

    if (error) {
      throw new Error(`[${table}] upsert failed on chunk ${i + 1}/${parts.length}: ${error.message}`);
    }

    inserted += payload.length;
    console.log(`[${table}] upserted chunk ${i + 1}/${parts.length} (${payload.length} rows)`);
  }

  console.log(`[${table}] completed upsert (${inserted} rows)`);
}

function buildGenres() {
  return Object.entries(GENRES).map(([id, name]) => ({
    id: asStringOrNull(id),
    name: asStringOrNull(name),
  }));
}

function buildPeople() {
  return PEOPLE.map((person) => ({
    id: asStringOrNull(person?.id),
    name: asStringOrNull(person?.name),
    roles: asArrayOrNull(person?.roles),
    image: asStringOrNull(person?.image),
  })).filter((person) => person.id);
}

function buildTitles(titles) {
  return titles
    .map((title) => ({
      id: asStringOrNull(title?.id),
      type: asStringOrNull(title?.type),
      title: asStringOrNull(title?.title),
      year: asNumberOrNull(title?.year),
      release_date: asStringOrNull(title?.releaseDate),
      poster: asStringOrNull(title?.media?.poster),
      backdrop: asStringOrNull(title?.media?.backdrop),
      trailer: asStringOrNull(title?.media?.trailer),
      synopsis: asStringOrNull(title?.details?.synopsis),
      runtime: asStringOrNull(title?.details?.runtime),
    }))
    .filter((title) => title.id);
}

function buildTitleGenres(titles, seededGenreIds) {
  const output = [];
  const skippedUnknown = new Set();

  for (const title of titles) {
    const titleId = asStringOrNull(title?.id);
    const genres = Array.isArray(title?.classification?.genres) ? title.classification.genres : [];

    if (!titleId || !genres.length) {
      continue;
    }

    for (const genreIdRaw of genres) {
      const genreId = asStringOrNull(genreIdRaw);
      if (!genreId) {
        continue;
      }

      if (!seededGenreIds.has(genreId)) {
        skippedUnknown.add(genreId);
        continue;
      }

      output.push({ title_id: titleId, genre_id: genreId });
    }
  }

  if (skippedUnknown.size) {
    const sample = Array.from(skippedUnknown).slice(0, 12);
    const sampleNames = sample.map((id) => `${id} (${GENRES[id] ?? titleCaseFromSnake(id)})`).join(", ");
    console.log(`[title_genres] skipped unknown genre IDs not present in GENRES: ${sampleNames}${skippedUnknown.size > sample.length ? ", ..." : ""}`);
  }

  const deduped = Array.from(new Map(output.map((row) => [`${row.title_id}::${row.genre_id}`, row])).values());
  return deduped;
}

function buildTitleCredits(titles, seededPeopleIds) {
  const output = [];
  const skippedUnknown = new Set();

  for (const title of titles) {
    const titleId = asStringOrNull(title?.id);
    if (!titleId) {
      continue;
    }

    const directorId = asStringOrNull(title?.people?.directorId);
    const composerId = asStringOrNull(title?.people?.composerId);

    if (directorId) {
      if (seededPeopleIds.has(directorId)) {
        output.push({ title_id: titleId, person_id: directorId, role: "director" });
      } else {
        skippedUnknown.add(directorId);
      }
    }

    if (composerId) {
      if (seededPeopleIds.has(composerId)) {
        output.push({ title_id: titleId, person_id: composerId, role: "composer" });
      } else {
        skippedUnknown.add(composerId);
      }
    }

    const writerIds = Array.isArray(title?.people?.writerIds) ? title.people.writerIds : [];
    for (const writerIdRaw of writerIds) {
      const writerId = asStringOrNull(writerIdRaw);
      if (writerId) {
        if (seededPeopleIds.has(writerId)) {
          output.push({ title_id: titleId, person_id: writerId, role: "writer" });
        } else {
          skippedUnknown.add(writerId);
        }
      }
    }

    const castIds = Array.isArray(title?.people?.castIds) ? title.people.castIds : [];
    for (const castIdRaw of castIds) {
      const castId = asStringOrNull(castIdRaw);
      if (castId) {
        if (seededPeopleIds.has(castId)) {
          output.push({ title_id: titleId, person_id: castId, role: "cast" });
        } else {
          skippedUnknown.add(castId);
        }
      }
    }
  }

  if (skippedUnknown.size) {
    const sample = Array.from(skippedUnknown).slice(0, 12);
    console.log(`[title_credits] skipped unknown person IDs not present in PEOPLE: ${sample.join(", ")}${skippedUnknown.size > sample.length ? ", ..." : ""}`);
  }

  return Array.from(
    new Map(output.map((row) => [`${row.title_id}::${row.person_id}::${row.role}`, row])).values(),
  );
}

async function seed() {
  console.log("Starting Supabase seed...");

  const titlesSource = [...MOVIES, ...SHOWS];

  const genresRows = buildGenres().filter((row) => row.id && row.name);
  const genreIds = new Set(genresRows.map((g) => g.id));

  const peopleRows = buildPeople();
  const titlesRows = buildTitles(titlesSource);
  const titleGenresRows = buildTitleGenres(titlesSource, genreIds);
  const peopleIds = new Set(peopleRows.map((person) => person.id));
  const titleCreditsRows = buildTitleCredits(titlesSource, peopleIds);

  console.log(`[genres] prepared ${genresRows.length} rows`);
  await upsertInChunks({ table: "genres", rows: genresRows, onConflict: "id" });

  console.log(`[people] prepared ${peopleRows.length} rows`);
  await upsertInChunks({ table: "people", rows: peopleRows, onConflict: "id" });

  console.log(`[titles] prepared ${titlesRows.length} rows`);
  await upsertInChunks({ table: "titles", rows: titlesRows, onConflict: "id" });

  console.log(`[title_genres] prepared ${titleGenresRows.length} rows`);
  await upsertInChunks({ table: "title_genres", rows: titleGenresRows, onConflict: "title_id,genre_id" });

  console.log(`[title_credits] prepared ${titleCreditsRows.length} rows`);
  await upsertInChunks({ table: "title_credits", rows: titleCreditsRows, onConflict: "title_id,person_id,role" });

  console.log("Seed completed successfully.");
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
