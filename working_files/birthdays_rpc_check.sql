-- ============================================================================
-- birthdays_rpc_check.sql — verify get_birthdays_today() after applying
-- supabase/migrations/20260911_birthdays_rpc.sql. Read-only, safe to re-run.
-- ============================================================================

-- 1. What day does the function think it is? (Should be the WIB date, not UTC.)
SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date AS hari_ini_wib,
       (now() AT TIME ZONE 'UTC')::date          AS hari_ini_utc;

-- 2. The function itself. Expect 0 rows today (11 Sep) — nobody has a birthday.
SELECT * FROM get_birthdays_today();

-- 3. Same logic as the function, shifted to TOMORROW.
--    Expect exactly 1 row: THEODORA LILIAN GIOVANI TANU | 3E | 58 | profile_id set | avatar set
WITH ref AS (
  SELECT ((now() AT TIME ZONE 'Asia/Jakarta')::date + 1) AS d
)
SELECT
  COALESCE(NULLIF(btrim(ar.nama_update), ''), ar.nama_lengkap)     AS nama,
  ar.kelas,
  (EXTRACT(YEAR FROM r.d) - EXTRACT(YEAR FROM ar.birthdate))::int  AS age,
  ar.profile_id,
  p.avatar_url
FROM   alumni_roster ar
CROSS  JOIN ref r
LEFT   JOIN profiles p ON p.id = ar.profile_id
WHERE  NOT ar.rip
  AND  ar.birthdate IS NOT NULL
  AND  EXTRACT(MONTH FROM ar.birthdate) = EXTRACT(MONTH FROM r.d)
  AND  EXTRACT(DAY   FROM ar.birthdate) = EXTRACT(DAY   FROM r.d)
ORDER  BY ar.kelas, ar.absen;

-- 4. Busiest real day of the year — 14 July. Expect exactly 4 rows:
--    RINA PRAMITA EFENDI 3B 58 · HENDRA HARNOKO 3C 59
--    ML JULIA PUSPASARI  3E 58 (profile_id NULL — belum bergabung) · RICKY ISKANDAR 3E 57
SELECT
  COALESCE(NULLIF(btrim(nama_update), ''), nama_lengkap) AS nama,
  kelas,
  (2026 - EXTRACT(YEAR FROM birthdate))::int             AS age,
  profile_id
FROM   alumni_roster
WHERE  NOT rip AND to_char(birthdate, 'MM-DD') = '07-14'
ORDER  BY kelas, absen;

-- 5. Coverage sanity — how many days of the year the card has someone to show.
--    Expect: 260 living alumni with a birthdate across 188 distinct days.
SELECT count(*)                                  AS alumni_hidup_dgn_ultah,
       count(DISTINCT to_char(birthdate,'MM-DD')) AS hari_terisi,
       365 - count(DISTINCT to_char(birthdate,'MM-DD')) AS hari_kosong
FROM   alumni_roster
WHERE  NOT rip AND birthdate IS NOT NULL;
