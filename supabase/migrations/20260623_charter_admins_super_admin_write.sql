-- Let super admins grant/revoke charter-admin roles.
--
-- `charter_admins` is base schema and — unlike `finance_admins` (which has an explicit
-- "FOR ALL USING (is_super_admin)" policy) — appears to have no super-admin WRITE policy.
-- With RLS enabled, the INSERT from Admin Roles is denied and (before the UI error fix)
-- failed silently. The columns (profile_id, charter_id, granted_by, granted_at) already exist,
-- so RLS is the only thing blocking it.
--
-- This policy is ADDITIVE: existing SELECT policies (e.g. a charter admin reading their own
-- rows in useAdminStatus) still apply and are OR'd with this one, so nothing is removed.
--
-- Apply in the Supabase SQL editor. If the surfaced UI error is NOT a row-level-security
-- violation on charter_admins, hold off — the fix would be different.

ALTER TABLE public.charter_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "charter_admins_super_admin_write" ON public.charter_admins;
CREATE POLICY "charter_admins_super_admin_write"
  ON public.charter_admins FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true)
  );
