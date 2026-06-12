-- Phase 3: Merchandise tables and RLS
-- Run this in Supabase SQL editor

-- ─── Merchandise items ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS merchandise (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  image_url   TEXT,
  price       BIGINT      NOT NULL DEFAULT 0,
  stock_total INTEGER     NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Order status enum ────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('submitted', 'pending_review', 'confirmed', 'rejected', 'shipped');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Merchandise orders ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS merchandise_orders (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  merchandise_id        UUID         NOT NULL REFERENCES merchandise(id) ON DELETE CASCADE,
  quantity              INTEGER      NOT NULL DEFAULT 1,
  member_amount         BIGINT       NOT NULL,
  admin_adjusted_amount BIGINT,
  receipt_url           TEXT,
  status                order_status NOT NULL DEFAULT 'submitted',
  member_notes          TEXT,
  admin_notes           TEXT,
  shipping_address      TEXT,
  reviewed_by           UUID         REFERENCES profiles(id),
  reviewed_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── RLS: merchandise ─────────────────────────────────────────────────────────
ALTER TABLE merchandise ENABLE ROW LEVEL SECURITY;

-- Anyone (authenticated or not) can view active items
CREATE POLICY "merchandise_public_select"
  ON merchandise FOR SELECT
  USING (is_active = true);

-- Super admins can manage all items
CREATE POLICY "merchandise_superadmin_all"
  ON merchandise FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- ─── RLS: merchandise_orders ─────────────────────────────────────────────────
ALTER TABLE merchandise_orders ENABLE ROW LEVEL SECURITY;

-- Members can view and insert their own orders
CREATE POLICY "orders_own_select"
  ON merchandise_orders FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "orders_own_insert"
  ON merchandise_orders FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- Charter admins and super admins can view orders for members in their scope
CREATE POLICY "orders_admin_select"
  ON merchandise_orders FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM charter_admins ca
      JOIN charter_members cm ON cm.charter_id = ca.charter_id
      WHERE ca.profile_id = auth.uid() AND cm.profile_id = merchandise_orders.profile_id
    )
  );

-- Admins can update orders (reconciliation, shipping status)
CREATE POLICY "orders_admin_update"
  ON merchandise_orders FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM charter_admins ca
      JOIN charter_members cm ON cm.charter_id = ca.charter_id
      WHERE ca.profile_id = auth.uid() AND cm.profile_id = merchandise_orders.profile_id
    )
  );

-- ─── updated_at triggers ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS merchandise_updated_at ON merchandise;
CREATE TRIGGER merchandise_updated_at
  BEFORE UPDATE ON merchandise
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS merchandise_orders_updated_at ON merchandise_orders;
CREATE TRIGGER merchandise_orders_updated_at
  BEFORE UPDATE ON merchandise_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
