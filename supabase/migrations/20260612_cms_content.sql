-- Phase 0: CMS Content Table
-- All editable page text and images are stored here.
-- site_settings is retained only for operational config (storage backend, feature flags, etc.)

CREATE TABLE IF NOT EXISTS cms_content (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key     TEXT NOT NULL,
  section_key  TEXT NOT NULL,
  field_key    TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text'
               CHECK (content_type IN ('text', 'richtext', 'image_url', 'json')),
  value        TEXT,
  updated_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (page_key, section_key, field_key)
);

-- RLS
ALTER TABLE cms_content ENABLE ROW LEVEL SECURITY;

-- Anyone can read
CREATE POLICY "cms_content_select"
  ON cms_content FOR SELECT
  USING (true);

-- Super admin: full write
CREATE POLICY "cms_content_superadmin_write"
  ON cms_content FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_super_admin = true
    )
  );

-- Charter admins: UPDATE only on their charter's page_key
CREATE POLICY "cms_content_charter_admin_update"
  ON cms_content FOR UPDATE
  USING (
    page_key LIKE 'charter:%'
    AND EXISTS (
      SELECT 1
      FROM charter_admins ca
      JOIN charters c ON c.id = ca.charter_id
      WHERE ca.profile_id = auth.uid()
        AND page_key = 'charter:' || c.slug
    )
  );

-- Storage bucket for CMS images
INSERT INTO storage.buckets (id, name, public)
VALUES ('cms-images', 'cms-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "cms_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cms-images');

CREATE POLICY "cms_images_admin_write"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'cms-images'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.is_super_admin = true
          OR EXISTS (SELECT 1 FROM charter_admins WHERE charter_admins.profile_id = auth.uid())
        )
    )
  );
