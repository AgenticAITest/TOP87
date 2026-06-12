-- Phase 1: Extended profile fields + friend relationships

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS nickname          TEXT,
  ADD COLUMN IF NOT EXISTS birthdate         DATE,
  ADD COLUMN IF NOT EXISTS whatsapp          TEXT,
  ADD COLUMN IF NOT EXISTS reunion_attendance TEXT
    CHECK (reunion_attendance IN ('yes', 'most_likely', 'undecided', 'no')),
  ADD COLUMN IF NOT EXISTS reunion_no_reason TEXT,
  ADD COLUMN IF NOT EXISTS funny_event       TEXT,
  ADD COLUMN IF NOT EXISTS message_to_friends TEXT;

CREATE TABLE IF NOT EXISTS profile_friends (
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rank       INTEGER NOT NULL CHECK (rank BETWEEN 1 AND 3),
  PRIMARY KEY (profile_id, rank),
  CONSTRAINT no_self_friend CHECK (profile_id <> friend_id)
);

-- RLS: members manage their own rows; approved members can read anyone's friends
ALTER TABLE profile_friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_manage_own_friends" ON profile_friends
  FOR ALL USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "approved_members_read_friends" ON profile_friends
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND status = 'approved'
    )
  );
