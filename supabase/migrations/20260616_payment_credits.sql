-- Add donation split tracking to payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS donation_amount BIGINT NOT NULL DEFAULT 0;

-- Junction table: which members' fees are credited by a given payment
CREATE TABLE IF NOT EXISTS payment_credits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id  UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  credited_by UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(payment_id, profile_id)
);

ALTER TABLE payment_credits ENABLE ROW LEVEL SECURITY;

-- Members see their own credits; super admins and charter admins see their members'
CREATE POLICY "payment_credits_select" ON payment_credits FOR SELECT USING (
  profile_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  OR EXISTS (
    SELECT 1 FROM charter_admins ca
    JOIN charter_members cm ON cm.charter_id = ca.charter_id
    WHERE ca.profile_id = auth.uid() AND cm.profile_id = payment_credits.profile_id
  )
);

-- Only super admins can write credits
CREATE POLICY "payment_credits_admin_write" ON payment_credits FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
);

GRANT SELECT ON payment_credits TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON payment_credits TO authenticated;
