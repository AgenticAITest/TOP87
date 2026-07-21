-- In Memoriam — expose ONLY the deceased alumni (safe columns: class + names) to logged-in users,
-- without granting broad read access to the committee-internal alumni_roster table (which is
-- super-admin-only RLS). SECURITY DEFINER runs the query as the owner, bypassing RLS, but returns
-- just the three display columns for rip = true rows — nothing else about the roster leaks.
--
-- ⚠️ NOT YET APPLIED to production — review, then run in the Supabase SQL editor BEFORE deploying
--    the front-end that calls list_memorials().

CREATE OR REPLACE FUNCTION public.list_memorials()
RETURNS TABLE (kelas text, nama_lengkap text, nama_update text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT kelas, nama_lengkap, nama_update
  FROM alumni_roster
  WHERE rip = true
  ORDER BY kelas, absen;
$$;

REVOKE ALL      ON FUNCTION public.list_memorials() FROM PUBLIC;
GRANT  EXECUTE  ON FUNCTION public.list_memorials() TO authenticated;
