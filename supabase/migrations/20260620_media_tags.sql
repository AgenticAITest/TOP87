-- Media tags: any approved member can tag existing media items.
-- Tags are plain text strings (no profile linking), stored separately
-- from media.tags (uploader-only) to allow post-upload additions.

CREATE TABLE IF NOT EXISTS media_tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id   UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  tag        TEXT NOT NULL CHECK (char_length(tag) >= 1 AND char_length(tag) <= 50),
  added_by   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(media_id, tag)
);

ALTER TABLE media_tags ENABLE ROW LEVEL SECURITY;

-- Any approved member can see all tags
CREATE POLICY "media_tags_select" ON media_tags
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'approved')
  );

-- Approved members can add tags as themselves
CREATE POLICY "media_tags_insert" ON media_tags
  FOR INSERT TO authenticated
  WITH CHECK (
    added_by = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'approved')
  );

-- Adder can remove own tags; super admins and charter admins can remove any
CREATE POLICY "media_tags_delete" ON media_tags
  FOR DELETE TO authenticated
  USING (
    added_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (SELECT 1 FROM charter_admins WHERE profile_id = auth.uid())
  );
