-- Roster statistics for the member dashboard — aggregated counts per class, NO names/PII, so it can
-- be exposed to any logged-in member while alumni_roster itself stays super-admin-only.
--
-- Categories are mutually exclusive with RIP taking precedence (a deceased person is only counted
-- under rip), so the five buckets always sum to total.
--
-- ⚠️ NOT YET APPLIED to production — review, then run in the Supabase SQL editor BEFORE deploying
--    the front-end that calls get_roster_stats().

CREATE OR REPLACE FUNCTION public.get_roster_stats()
RETURNS TABLE (
  kelas        text,
  total        bigint,
  hadir        bigint,
  belum_tahu   bigint,
  belum_isi    bigint,
  rip          bigint,
  belum_daftar bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    kelas,
    count(*)                                                   AS total,
    count(*) FILTER (WHERE NOT rip AND status = 'hadir')       AS hadir,
    count(*) FILTER (WHERE NOT rip AND status = 'belum_tahu')  AS belum_tahu,
    count(*) FILTER (WHERE NOT rip AND status = 'belum_isi')   AS belum_isi,
    count(*) FILTER (WHERE rip)                                 AS rip,
    count(*) FILTER (WHERE NOT rip AND status IS NULL)          AS belum_daftar
  FROM alumni_roster
  GROUP BY kelas
  ORDER BY kelas;
$$;

REVOKE ALL     ON FUNCTION public.get_roster_stats() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_roster_stats() TO authenticated;
