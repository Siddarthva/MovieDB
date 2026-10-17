-- 003 enable Row Level Security  --  REQUIRES APPROVAL BEFORE RUNNING.
--
-- Why: database.sql disables RLS on every table, which lets anyone holding the public anon key
-- read AND WRITE all data directly through Supabase's REST API, bypassing the Express API.
--
-- Effect: with RLS enabled and no policies, the anon/authenticated roles can read nothing.
-- The MovieDB backend uses the service-role key, which bypasses RLS, so the application keeps
-- working. The browser apps never query Supabase tables directly (the admin app only uses
-- Supabase Auth), so they are unaffected.
--
-- PREREQUISITE: the backend must be running with SUPABASE_SERVICE_ROLE_KEY (not the anon key),
-- otherwise the API loses access to all data the moment this runs.
--
-- Rollback: ALTER TABLE <t> DISABLE ROW LEVEL SECURITY; for each table below.

ALTER TABLE genres        ENABLE ROW LEVEL SECURITY;
ALTER TABLE people        ENABLE ROW LEVEL SECURITY;
ALTER TABLE titles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE title_genres  ENABLE ROW LEVEL SECURITY;
ALTER TABLE title_credits ENABLE ROW LEVEL SECURITY;
