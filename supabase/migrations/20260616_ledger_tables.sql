-- Ledger model: member_accounts + account_transactions
-- Replaces inference-based payment_credits with explicit per-account transaction rows.

-- ── 1. member_accounts ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS member_accounts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID        REFERENCES profiles(id) ON DELETE CASCADE,
  account_type TEXT        NOT NULL CHECK (account_type IN ('iuran', 'donation', 'merchandise')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One iuran/donation/merchandise account per member
CREATE UNIQUE INDEX IF NOT EXISTS idx_member_accounts_member
  ON member_accounts(profile_id, account_type)
  WHERE profile_id IS NOT NULL;

-- One pool account per type (profile_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_member_accounts_pool
  ON member_accounts(account_type)
  WHERE profile_id IS NULL;

-- ── 2. account_transactions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS account_transactions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   UUID        NOT NULL REFERENCES member_accounts(id) ON DELETE RESTRICT,
  amount       BIGINT      NOT NULL CHECK (amount > 0),
  payment_id   UUID        REFERENCES payments(id) ON DELETE RESTRICT,
  created_by   UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note         TEXT
);

CREATE INDEX IF NOT EXISTS idx_acct_txn_account  ON account_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_acct_txn_payment  ON account_transactions(payment_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE member_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_transactions ENABLE ROW LEVEL SECURITY;

-- member_accounts: visible to owning member, pool accounts to all authenticated, super admins see all
CREATE POLICY "ma_select" ON member_accounts FOR SELECT USING (
  profile_id IS NULL
  OR profile_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  OR EXISTS (
    SELECT 1 FROM charter_admins ca
    JOIN charter_members cm ON cm.charter_id = ca.charter_id
    WHERE ca.profile_id = auth.uid() AND cm.profile_id = member_accounts.profile_id
  )
);

-- account_transactions: visible when the linked account is visible
CREATE POLICY "at_select" ON account_transactions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM member_accounts ma
    WHERE ma.id = account_transactions.account_id
    AND (
      ma.profile_id IS NULL
      OR ma.profile_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
      OR EXISTS (
        SELECT 1 FROM charter_admins ca
        JOIN charter_members cm ON cm.charter_id = ca.charter_id
        WHERE ca.profile_id = auth.uid() AND cm.profile_id = ma.profile_id
      )
    )
  )
);

-- Only super admins write
CREATE POLICY "ma_admin_write" ON member_accounts FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
);

CREATE POLICY "at_admin_write" ON account_transactions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
);

GRANT SELECT ON member_accounts      TO anon, authenticated;
GRANT SELECT ON account_transactions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON member_accounts      TO authenticated;
GRANT INSERT, UPDATE, DELETE ON account_transactions TO authenticated;

-- ── Pre-create pool accounts ──────────────────────────────────────────────────
INSERT INTO member_accounts (profile_id, account_type)
VALUES (NULL, 'donation'), (NULL, 'merchandise')
ON CONFLICT DO NOTHING;

-- ── Create iuran accounts for all existing approved members ───────────────────
INSERT INTO member_accounts (profile_id, account_type)
SELECT id, 'iuran' FROM profiles WHERE status = 'approved'
ON CONFLICT DO NOTHING;

-- ── Migrate existing confirmed data ───────────────────────────────────────────
DO $$
DECLARE
  fee_target   BIGINT;
  credit_count BIGINT;
  payer_share  BIGINT;
  don_amount   BIGINT;
  p            RECORD;
BEGIN
  SELECT COALESCE(value::BIGINT, 1870000) INTO fee_target
  FROM site_settings WHERE key = 'reunion_fee_target';
  fee_target := COALESCE(fee_target, 1870000);

  FOR p IN
    SELECT id, profile_id, member_amount, donation_amount, reviewed_by
    FROM payments
    WHERE type = 'reunion_fee' AND status = 'confirmed'
  LOOP
    SELECT COUNT(*) INTO credit_count FROM payment_credits WHERE payment_id = p.id;

    -- Post credited members' iuran
    INSERT INTO account_transactions (account_id, amount, payment_id, created_by, note)
    SELECT ma.id, fee_target, p.id, credited_by, 'Migrated: kredit iuran'
    FROM payment_credits pc
    JOIN member_accounts ma ON ma.profile_id = pc.profile_id AND ma.account_type = 'iuran'
    WHERE pc.payment_id = p.id
    ON CONFLICT DO NOTHING;

    -- Post payer's own iuran if amount covers it
    IF p.member_amount >= fee_target * (credit_count + 1) THEN
      INSERT INTO account_transactions (account_id, amount, payment_id, created_by, note)
      SELECT ma.id, fee_target, p.id, p.reviewed_by, 'Migrated: iuran payer'
      FROM member_accounts ma
      WHERE ma.profile_id = p.profile_id AND ma.account_type = 'iuran'
      ON CONFLICT DO NOTHING;
      payer_share := 1;
    ELSE
      payer_share := 0;
    END IF;

    -- Post remainder to donation pool
    don_amount := p.member_amount - fee_target * (credit_count + payer_share);
    IF don_amount > 0 THEN
      INSERT INTO account_transactions (account_id, amount, payment_id, created_by, note)
      SELECT ma.id, don_amount, p.id, p.reviewed_by, 'Migrated: donasi'
      FROM member_accounts ma
      WHERE ma.profile_id IS NULL AND ma.account_type = 'donation'
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- Migrate standalone donation-type payments
  -- Use alias 'pay' to avoid conflict with the loop variable 'p'
  INSERT INTO account_transactions (account_id, amount, payment_id, created_by, note)
  SELECT ma.id, COALESCE(pay.admin_adjusted_amount, pay.member_amount), pay.id, pay.reviewed_by, 'Migrated: donasi murni'
  FROM payments pay
  JOIN member_accounts ma ON ma.profile_id IS NULL AND ma.account_type = 'donation'
  WHERE pay.type = 'donation' AND pay.status = 'confirmed';
END $$;
