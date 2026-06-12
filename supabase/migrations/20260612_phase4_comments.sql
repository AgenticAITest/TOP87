-- Phase 4: Media Comments + Budget Target

-- ─── media_comments ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS media_comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id   UUID        NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  profile_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body       TEXT        NOT NULL CHECK (char_length(body) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS media_comments_media_id_idx ON media_comments(media_id);
CREATE INDEX IF NOT EXISTS media_comments_created_at_idx ON media_comments(created_at DESC);

ALTER TABLE media_comments ENABLE ROW LEVEL SECURITY;

-- Approved members can read all comments
CREATE POLICY "comments_approved_select" ON media_comments FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'approved'));

-- Approved members can insert their own comments
CREATE POLICY "comments_own_insert" ON media_comments FOR INSERT
  WITH CHECK (
    profile_id = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'approved')
  );

-- Members can delete their own comments
CREATE POLICY "comments_own_delete" ON media_comments FOR DELETE
  USING (profile_id = auth.uid());

-- Admins can delete any comment
CREATE POLICY "comments_admin_delete" ON media_comments FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles  WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (SELECT 1 FROM charter_admins WHERE profile_id = auth.uid())
  );

-- ─── Budget total target key ──────────────────────────────────────────────────
INSERT INTO site_settings (key, value)
VALUES ('budget_total_target', '247000000')
ON CONFLICT (key) DO NOTHING;
