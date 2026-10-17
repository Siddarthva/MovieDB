import { createClient } from "@supabase/supabase-js";
import { loadEnvFiles } from './src/config.js';

import { GENRES } from "./data/genres.js";
import { PEOPLE } from "./data/people.js";
import { MOVIES } from "./data/movies.js";
import { SHOWS } from "./data/shows.js";
import { buildSeedRows } from "./seed/transform.js";

loadEnvFiles();

// Seeding writes to the database, so it needs the server-side service-role key.
// The legacy VITE_ names are still read so existing .env files keep working.
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing. Check backend/.env.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const chunk = (arr, size = 500) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
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

async function seed() {
  console.log("Starting Supabase seed...");

  const { genres, people, titles, titleGenres, titleCredits, skipped } = buildSeedRows({ GENRES, PEOPLE, MOVIES, SHOWS });
  if (skipped.genres.length) console.log(`[title_genres] skipped unknown genre ids: ${skipped.genres.slice(0, 12).join(", ")}`);
  if (skipped.people.length) console.log(`[title_credits] skipped unknown person ids: ${skipped.people.slice(0, 12).join(", ")}`);

  await upsertInChunks({ table: "genres", rows: genres, onConflict: "id" });
  await upsertInChunks({ table: "people", rows: people, onConflict: "id" });
  await upsertInChunks({ table: "titles", rows: titles, onConflict: "id" });
  await upsertInChunks({ table: "title_genres", rows: titleGenres, onConflict: "title_id,genre_id" });
  await upsertInChunks({ table: "title_credits", rows: titleCredits, onConflict: "title_id,person_id,role" });

  console.log("Seed completed successfully.");
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
