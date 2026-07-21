-- Alumni master roster — the full Class of '87 rollcall (all 276 alumni across 3A–3F), imported from
-- the committee's manual attendance sheet. This is the MASTER LIST / allowlist that registered
-- accounts get linked to via profile_id (populated later by the admin matching tool). It is the true
-- denominator for "who exists" and the source of the outreach gap (who hasn't registered yet).
--
-- Committee-internal data (includes non-members and deceased flags) → super-admin only.
--
-- ⚠️ NOT YET APPLIED to production — review, then run in the Supabase SQL editor. Run the companion
--    seed (20260721_alumni_roster_seed.sql) AFTER this file.

CREATE TABLE IF NOT EXISTS alumni_roster (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kelas         text NOT NULL CHECK (kelas IN ('3A','3B','3C','3D','3E','3F')),
  absen         int  NOT NULL,
  nama_lengkap  text NOT NULL,          -- name as it appeared on the 1987 roster
  nama_update   text,                    -- current / updated name (NULL if unchanged)
  status        text CHECK (status IN ('hadir','belum_tahu','belum_isi')),  -- NULL = no response yet
  rip           boolean NOT NULL DEFAULT false,                              -- deceased (✝)
  profile_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,  -- linked registered account (Phase 2)
  matched_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,  -- admin who confirmed the link
  matched_at    timestamptz,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kelas, absen)
);

CREATE INDEX IF NOT EXISTS alumni_roster_profile_id_idx ON alumni_roster(profile_id);
CREATE INDEX IF NOT EXISTS alumni_roster_kelas_idx       ON alumni_roster(kelas);

-- One account links to at most one roster entry (1:1).
CREATE UNIQUE INDEX IF NOT EXISTS alumni_roster_profile_unique
  ON alumni_roster(profile_id) WHERE profile_id IS NOT NULL;

ALTER TABLE alumni_roster ENABLE ROW LEVEL SECURITY;

-- Super-admin only for now. Broaden to charter admins (scoped) later if the matching tool needs it.
CREATE POLICY "alumni_roster_superadmin_all" ON alumni_roster
  FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));
