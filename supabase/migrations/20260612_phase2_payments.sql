-- Phase 2: Payments (Reunion Fees + Donations)
-- Run this in Supabase Dashboard → SQL Editor

-- ── ENUM types ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE payment_type AS ENUM ('reunion_fee', 'donation');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('submitted', 'pending_review', 'confirmed', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Payments table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type                  payment_type NOT NULL,
  member_amount         BIGINT NOT NULL,
  admin_adjusted_amount BIGINT,
  receipt_url           TEXT,
  status                payment_status NOT NULL DEFAULT 'submitted',
  member_notes          TEXT,
  admin_notes           TEXT,
  reviewed_by           UUID REFERENCES profiles(id),
  reviewed_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payments_profile_id_idx ON payments(profile_id);
CREATE INDEX IF NOT EXISTS payments_type_idx       ON payments(type);
CREATE INDEX IF NOT EXISTS payments_status_idx     ON payments(status);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Members: see and insert their own payments
CREATE POLICY "payments_own_select" ON payments
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "payments_own_insert" ON payments
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- Admins (super admin or charter admin): see ALL payments, update any
CREATE POLICY "payments_admin_select" ON payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR
    EXISTS (SELECT 1 FROM charter_admins WHERE profile_id = auth.uid())
  );

CREATE POLICY "payments_admin_update" ON payments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR
    EXISTS (SELECT 1 FROM charter_admins WHERE profile_id = auth.uid())
  );

-- ── site_settings QRIS / target keys ─────────────────────────────────────────
-- Inserted with empty defaults so admin UI can read them on first load.
INSERT INTO site_settings (key, value) VALUES
  ('qris_image_url',     ''),
  ('qris_bank_name',     ''),
  ('qris_account_no',    ''),
  ('qris_account_name',  ''),
  ('reunion_fee_target', '2017000'),
  ('donation_target',    '10000000')
ON CONFLICT (key) DO NOTHING;
