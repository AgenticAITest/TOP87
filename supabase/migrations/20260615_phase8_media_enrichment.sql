-- Phase 8: Media Enrichment — tags, multi-charter media, threaded comments
-- 2026-06-15

-- ─── 1. tags column ───────────────────────────────────────────────────────────

ALTER TABLE media ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- Backfill: all existing rows get at least one tag
UPDATE media SET tags = ARRAY['reuni'] WHERE cardinality(tags) = 0;

-- Constraint: at least one tag required going forward
ALTER TABLE media ADD CONSTRAINT media_tags_not_empty CHECK (cardinality(tags) >= 1);

-- ─── 2. Full-text search vector (generated, no trigger needed) ────────────────

ALTER TABLE media ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
  GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      COALESCE(caption, '') || ' ' || array_to_string(tags, ' ')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS media_search_vector_idx ON media USING GIN (search_vector);

-- ─── 3. media_charters junction table ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS media_charters (
  media_id   UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  charter_id UUID NOT NULL REFERENCES charters(id) ON DELETE CASCADE,
  PRIMARY KEY (media_id, charter_id)
);

-- Backfill from existing charter_id
INSERT INTO media_charters (media_id, charter_id)
SELECT id, charter_id
FROM   media
WHERE  charter_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE media_charters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_charters_read_all" ON media_charters
  FOR SELECT USING (true);

CREATE POLICY "media_charters_insert_own" ON media_charters
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM media m
      WHERE  m.id = media_id
        AND  m.profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE  p.id = auth.uid() AND p.is_super_admin = true
    )
  );

CREATE POLICY "media_charters_delete_admin" ON media_charters
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE  p.id = auth.uid() AND p.is_super_admin = true
    )
  );

-- ─── 4. Threaded comments ─────────────────────────────────────────────────────

ALTER TABLE media_comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES media_comments(id) ON DELETE CASCADE;
