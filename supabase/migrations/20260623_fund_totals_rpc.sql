-- Allocation-aware fundraising totals for the public member dashboard.
--
-- Members can only read their own payments/iuran via RLS, so a global, allocation-aware
-- total can't be computed client-side. This SECURITY DEFINER function aggregates server-side
-- and returns only two numbers (no row leakage), so it's safe to expose to everyone.
--
-- "Reclassify" model: money follows where it was allocated, not the payment's original type —
--   iuran  = iuran ledger allocations + confirmed reunion_fee payments not yet allocated
--   donasi = donation-pool allocations + confirmed donation payments not yet allocated
-- Mirrors fetchFundTotals() / fetchPaymentSummaryReport in the app.
--
-- Safe to apply anytime: the app prefers this RPC and silently falls back to the old
-- type-based total if it's absent, so deploy order doesn't matter.

CREATE OR REPLACE FUNCTION public.get_fund_totals()
RETURNS TABLE (reunion_fee bigint, donation bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH iuran_alloc AS (
    SELECT at.payment_id, at.amount
    FROM account_transactions at
    JOIN member_accounts ma ON ma.id = at.account_id
    WHERE ma.account_type = 'iuran' AND ma.profile_id IS NOT NULL
  ),
  don_alloc AS (
    SELECT at.payment_id, at.amount
    FROM account_transactions at
    JOIN member_accounts ma ON ma.id = at.account_id
    JOIN payments p ON p.id = at.payment_id
    WHERE ma.account_type = 'donation' AND ma.profile_id IS NULL
      AND p.status IN ('confirmed', 'bank_reconciled')
  ),
  allocated AS (
    SELECT payment_id FROM iuran_alloc WHERE payment_id IS NOT NULL
    UNION
    SELECT payment_id FROM don_alloc   WHERE payment_id IS NOT NULL
  ),
  unallocated AS (
    SELECT p.type, COALESCE(p.admin_adjusted_amount, p.member_amount) AS amt
    FROM payments p
    WHERE p.status IN ('confirmed', 'bank_reconciled')
      AND p.id NOT IN (SELECT payment_id FROM allocated)
  )
  SELECT
    (COALESCE((SELECT SUM(amount) FROM iuran_alloc), 0)
     + COALESCE((SELECT SUM(amt) FROM unallocated WHERE type = 'reunion_fee'), 0))::bigint AS reunion_fee,
    (COALESCE((SELECT SUM(amount) FROM don_alloc), 0)
     + COALESCE((SELECT SUM(amt) FROM unallocated WHERE type = 'donation'), 0))::bigint AS donation;
$$;

GRANT EXECUTE ON FUNCTION public.get_fund_totals() TO anon, authenticated;
