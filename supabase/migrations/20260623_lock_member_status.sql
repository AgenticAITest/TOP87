-- Defense in depth: stop members from changing their own membership status.
--
-- The app already preserves status on profile edits (Register/MyProfile), but this trigger
-- guarantees that no client path — present or future — can let a non-admin self-promote
-- (pending -> approved) or undo a suspension. It NEVER raises an error: it silently keeps the
-- existing status, so clients don't break.
--
-- ⚠️ NOT YET APPLIED to production. Review the status policy below before running:
--   - Allows first-time assignment (OLD.status NULL) and back-end/service-role calls (no JWT).
--   - Allows a member to re-apply after rejection (rejected -> pending). Remove that clause if
--     rejected members should NOT be able to re-apply by editing.
--   - Admins (super admin or any charter admin) may change anyone's status.

CREATE OR REPLACE FUNCTION public.prevent_member_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Trusted back-end contexts (no JWT) and the very first status assignment are allowed.
  IF auth.uid() IS NULL OR OLD.status IS NULL THEN
    RETURN NEW;
  END IF;

  -- No status change → nothing to enforce.
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- A rejected member may re-apply by editing their profile (rejected -> pending).
  IF OLD.status = 'rejected' AND NEW.status = 'pending' THEN
    RETURN NEW;
  END IF;

  -- Admins may change anyone's status (approve / reject / suspend).
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin)
     OR EXISTS (SELECT 1 FROM public.charter_admins ca WHERE ca.profile_id = auth.uid())
  THEN
    RETURN NEW;
  END IF;

  -- Non-admin trying to change an existing status → silently preserve it.
  NEW.status := OLD.status;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_member_status_change ON public.profiles;
CREATE TRIGGER trg_prevent_member_status_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_member_status_change();
