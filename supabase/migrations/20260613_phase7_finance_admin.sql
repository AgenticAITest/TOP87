-- Phase 7.2 — Finance Admin Role
-- Creates finance_admins table and RLS policies for bank reconciliation workflow.

CREATE TABLE IF NOT EXISTS finance_admins (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE finance_admins ENABLE ROW LEVEL SECURITY;

-- Super admins manage finance_admins
CREATE POLICY "finance_admins_super_admin"
  ON finance_admins FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- Finance admins can read their own row (used by useAdminStatus hook)
CREATE POLICY "finance_admins_self_select"
  ON finance_admins FOR SELECT
  USING (profile_id = auth.uid());

-- Finance admins can read all payments (to display the reconciliation queue)
CREATE POLICY "payments_finance_admin_select"
  ON payments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM finance_admins WHERE profile_id = auth.uid())
  );

-- Finance admins can only move confirmed → bank_reconciled (RLS enforces this)
CREATE POLICY "payments_finance_admin_update"
  ON payments FOR UPDATE
  USING (
    status = 'confirmed'
    AND EXISTS (SELECT 1 FROM finance_admins WHERE profile_id = auth.uid())
  )
  WITH CHECK (status = 'bank_reconciled');

-- Add bank_reconciled to the payments status enum if not already there
-- (safe to run even if it already exists via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_status')
    AND enumlabel = 'bank_reconciled'
  ) THEN
    ALTER TYPE payment_status ADD VALUE 'bank_reconciled';
  END IF;
EXCEPTION WHEN undefined_object THEN
  -- status column is text, not enum — no action needed
  NULL;
END $$;
