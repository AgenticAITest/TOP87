-- Part 3d — "Confirmed is final" enforced at the database layer (defense in depth).
--
-- The app (AdminPayments edit drawer) already freezes a confirmed payment, but these two
-- triggers guarantee the rule holds for ANY client path — present or future, UI or stray script.
--
-- Rules enforced:
--   1. A payment's status may only move FORWARD out of 'confirmed' to 'bank_reconciled'.
--      'confirmed' can never go back to submitted/pending_review/rejected; 'bank_reconciled'
--      is terminal.
--   2. Ledger rows (account_transactions) tied to a confirmed/bank_reconciled payment cannot be
--      inserted, edited, or deleted — the allocation is frozen the moment the payment is confirmed.
--
-- ESCAPE HATCH (by design): trusted back-end contexts with no JWT (auth.uid() IS NULL) bypass both
-- triggers. That is exactly the "direct DB correction" path — a super admin fixing a genuine
-- mistake from the Supabase SQL editor runs as the service role and is allowed through. There is
-- intentionally NO in-app reversal.
--
-- WHY the normal confirm flow still works: the app saves the allocation (writes account_transactions)
-- WHILE the payment is still submitted/pending_review, and only THEN flips the status to 'confirmed'
-- in a second request. So the ledger writes happen before the freeze applies; nothing is blocked.
--
-- ⚠️ NOT YET APPLIED to production — review, then run in the Supabase SQL editor.

-- ── 1. Lock payment status transitions ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.lock_confirmed_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Trusted back-end / direct SQL corrections (no JWT) bypass the lock.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Status unchanged → nothing to enforce (other column edits are not this trigger's concern).
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Once confirmed, the only legal forward move is to bank_reconciled.
  IF OLD.status = 'confirmed' THEN
    IF NEW.status = 'bank_reconciled' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Pembayaran yang sudah dikonfirmasi bersifat final dan tidak dapat diubah (% -> %)',
      OLD.status, NEW.status;
  END IF;

  -- bank_reconciled is terminal.
  IF OLD.status = 'bank_reconciled' THEN
    RAISE EXCEPTION 'Pembayaran yang sudah direkonsiliasi bersifat final';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_confirmed_payment_status ON public.payments;
CREATE TRIGGER trg_lock_confirmed_payment_status
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.lock_confirmed_payment_status();

-- ── 2. Freeze ledger rows of a confirmed payment ──────────────────────────────
CREATE OR REPLACE FUNCTION public.freeze_confirmed_payment_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pstatus TEXT;
BEGIN
  -- Trusted back-end / direct SQL corrections (no JWT) bypass the freeze.
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- On UPDATE, also protect the row's ORIGINAL payment (block moving an allocation off a
  -- frozen payment), not just the new target.
  IF TG_OP = 'UPDATE' AND OLD.payment_id IS DISTINCT FROM NEW.payment_id
     AND OLD.payment_id IS NOT NULL THEN
    SELECT status INTO pstatus FROM payments WHERE id = OLD.payment_id;
    IF pstatus IN ('confirmed', 'bank_reconciled') THEN
      RAISE EXCEPTION 'Alokasi pembayaran yang sudah dikonfirmasi tidak dapat diubah';
    END IF;
  END IF;

  -- The payment affected by this write (target on INSERT/UPDATE, existing on DELETE).
  IF TG_OP = 'DELETE' THEN
    pstatus := NULL;
    IF OLD.payment_id IS NOT NULL THEN
      SELECT status INTO pstatus FROM payments WHERE id = OLD.payment_id;
    END IF;
  ELSE
    pstatus := NULL;
    IF NEW.payment_id IS NOT NULL THEN
      SELECT status INTO pstatus FROM payments WHERE id = NEW.payment_id;
    END IF;
  END IF;

  IF pstatus IN ('confirmed', 'bank_reconciled') THEN
    RAISE EXCEPTION 'Alokasi pembayaran yang sudah dikonfirmasi tidak dapat diubah';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_freeze_confirmed_payment_ledger ON public.account_transactions;
CREATE TRIGGER trg_freeze_confirmed_payment_ledger
  BEFORE INSERT OR UPDATE OR DELETE ON public.account_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.freeze_confirmed_payment_ledger();
