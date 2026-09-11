-- Today's birthdays for the member dashboard card.
--
-- Reads alumni_roster (the committee master, which now carries birthdate for all 276 alumni) so the
-- card covers the ~125 alumni who have not registered, not just the 135 with accounts. Exposes only
-- name + class + age + avatar — no birth date, no phone, no other PII — via SECURITY DEFINER so
-- alumni_roster itself stays super-admin-only. Same shape as list_class_roster()/get_roster_stats(),
-- which already expose every alumnus's name to any logged-in member.
--
-- ⚠️ Two things this deliberately does NOT use:
--    · current_date — the Supabase instance runs UTC, so the card would flip a day early at 17:00
--      WIB. The reference day is pinned to Asia/Jakarta.
--    · profiles.birthdate — the roster is authoritative. The two are identical as of the
--      2026-09-11 import; a member editing their own DOB will not move this card.
--
-- Deceased alumni (rip) are excluded. No alumnus in the roster has a 29 Feb birthday, so there is
-- no leap-day fallback to worry about.
--
-- ⚠️ NOT YET APPLIED to production — review, then run in the Supabase SQL editor BEFORE deploying
--    the front-end that calls get_birthdays_today().

CREATE OR REPLACE FUNCTION public.get_birthdays_today()
RETURNS TABLE (
  nama       text,
  kelas      text,
  age        int,
  profile_id uuid,
  avatar_url text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH today AS (
    SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date AS d
  )
  SELECT
    COALESCE(NULLIF(btrim(ar.nama_update), ''), ar.nama_lengkap)              AS nama,
    ar.kelas,
    (EXTRACT(YEAR FROM t.d) - EXTRACT(YEAR FROM ar.birthdate))::int           AS age,
    ar.profile_id,
    p.avatar_url
  FROM   alumni_roster ar
  CROSS  JOIN today t
  LEFT   JOIN profiles p ON p.id = ar.profile_id
  WHERE  NOT ar.rip
    AND  ar.birthdate IS NOT NULL
    AND  EXTRACT(MONTH FROM ar.birthdate) = EXTRACT(MONTH FROM t.d)
    AND  EXTRACT(DAY   FROM ar.birthdate) = EXTRACT(DAY   FROM t.d)
  ORDER  BY ar.kelas, ar.absen;
$$;

REVOKE ALL     ON FUNCTION public.get_birthdays_today() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_birthdays_today() TO authenticated;

-- Verification: should return the people whose birthday falls on today's WIB date.
--   SELECT * FROM get_birthdays_today();
-- Cross-check against the roster for an arbitrary day (e.g. 14 Jul → 4 people):
--   SELECT kelas, absen, COALESCE(NULLIF(btrim(nama_update),''), nama_lengkap), birthdate
--   FROM alumni_roster
--   WHERE NOT rip AND to_char(birthdate, 'MM-DD') = '07-14' ORDER BY kelas, absen;
