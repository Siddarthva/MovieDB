-- 005 grant the admin role to a user (TEMPLATE — edit the email, then run manually).
--
-- The API authorises writes by reading `app_metadata.role` from the user's Supabase Auth
-- token. app_metadata can only be changed server-side (SQL editor / service role), never by
-- the user, so this is safe against self-promotion.
--
-- 1. Create the user first: Supabase dashboard -> Authentication -> Users -> Add user.
-- 2. Replace the e-mail below and run in the SQL editor.
-- 3. The user must sign in again so the new claim appears in their token.

UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE email = 'admin@example.com';

-- Revoke:
-- UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data - 'role' WHERE email = 'admin@example.com';
