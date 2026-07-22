-- Per-class roster for the member "class detail" page — returns each classmate's name + attendance
-- status for one class, so members can see who still needs contacting. Exposes only name + status
-- + deceased flag (no phone/PII), via SECURITY DEFINER so alumni_roster stays super-admin-only.
-- Any logged-in member may call it (the page itself is gated to approved members).
--
-- ⚠️ NOT YET APPLIED to production — review, then run in the Supabase SQL editor BEFORE deploying
--    the front-end that calls list_class_roster().

CREATE OR REPLACE FUNCTION public.list_class_roster(p_kelas text)
RETURNS TABLE (nama_lengkap text, nama_update text, status text, rip boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT nama_lengkap, nama_update, status, rip
  FROM alumni_roster
  WHERE kelas = p_kelas
  ORDER BY absen;
$$;

REVOKE ALL     ON FUNCTION public.list_class_roster(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.list_class_roster(text) TO authenticated;
