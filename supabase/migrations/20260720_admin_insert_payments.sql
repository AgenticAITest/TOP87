-- Admin manual payment entry — let super admins INSERT a payment on behalf of any member.
--
-- Members self-insert via payments_own_insert (WITH CHECK profile_id = auth.uid()). Admins had
-- SELECT-all and UPDATE-all policies but NO insert path, so recording an OFFLINE payment (cash or
-- manual bank transfer) for a member was impossible from the app. This adds a super-admin-only
-- INSERT policy. Postgres ORs permissive policies, so the net rule becomes:
--   insert allowed if (own payment) OR (caller is super admin).
--
-- Scope: super admin ONLY. Charter admins cannot allocate/confirm (that path is super-admin only),
-- so they are not given an entry path either — an entered payment must be allocatable by its author.
--
-- The created row lands as status 'pending_review'; the super admin then allocates & confirms it
-- through the normal AdminPayments edit drawer (allocation-first — see 20260627_lock_confirmed_payments).
--
-- ⚠️ NOT YET APPLIED to production — review, then run in the Supabase SQL editor BEFORE deploying
--    the front-end that calls adminCreatePayment().

CREATE POLICY "payments_admin_insert" ON payments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );
