-- Member's actual class (kelas) at graduation: 3A–3F.
-- Apply this BEFORE deploying the front-end that writes `kelas` — otherwise profile
-- saves (Register submit, My Profile save) would fail on a missing column.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kelas text
  CHECK (kelas IS NULL OR kelas IN ('3A', '3B', '3C', '3D', '3E', '3F'));
