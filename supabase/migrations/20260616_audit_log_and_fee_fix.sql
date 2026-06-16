-- Fix reunion_fee_target stored value
INSERT INTO site_settings (key, value)
VALUES ('reunion_fee_target', '1870000')
ON CONFLICT (key) DO UPDATE SET value = '1870000';

-- Ensure audit_log exists with the correct schema
CREATE TABLE IF NOT EXISTS audit_log (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  action     TEXT        NOT NULL,
  actor_id   UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  target_id  TEXT,
  details    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add any columns that may be missing if the table was created manually without them
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS actor_id  UUID  REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS target_id TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS details   JSONB;

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Super admins can read full audit trail
DROP POLICY IF EXISTS "audit_log_read_super_admin" ON audit_log;
CREATE POLICY "audit_log_read_super_admin" ON audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- Any authenticated user can insert audit entries (writes come from server-side actions)
DROP POLICY IF EXISTS "audit_log_insert_authenticated" ON audit_log;
CREATE POLICY "audit_log_insert_authenticated" ON audit_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

GRANT SELECT, INSERT ON audit_log TO authenticated;
