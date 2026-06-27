# Plan: Allocation-first payments + two glitch fixes

Status: Parts 1, 2, and 3a–3c done (code). Part 2 SQL applied ✅ (totals verified). Part 3d SQL
(triggers) still to apply in the Supabase SQL editor — see migration
`20260627_lock_confirmed_payments.sql`.

## Background (the two glitches)
After an admin reconciles a confirmed payment (status `confirmed → bank_reconciled` in
`AdminBankRekon.tsx:25`), two things break:

- **Glitch 1 — member sees "Dikirim" again.** The member payment screen has no label for the
  `bank_reconciled` stage, so it falls back to the "Dikirim" default. Display-only; money is fine.
- **Glitch 2 — admin "Iuran Terkonfirmasi" total drops (e.g. back to 770K).** Every total counts a
  payment only while its status literally equals `confirmed`; reconcile changes it to
  `bank_reconciled` and an *unallocated* payment falls out of the total.

Root cause for both: `bank_reconciled` is treated as *less* settled than `confirmed`, when it is the
most-settled stage. The only place that treats it correctly today is `fetchConfirmedPayments`
(`queries.ts:1023`, uses `IN ('confirmed','bank_reconciled')`).

## Design decisions (locked)
- **Option B chosen:** allocation is mandatory *before* a payment can be confirmed; confirmed is
  **final** — no editing allocation, no reversal/rejection, status only moves forward to
  `bank_reconciled`.
- **No legacy backfill** — current payment rows are throwaway test data; real data re-entered later.
- **No reversal path** by design — a mistaken confirm is fixed only by a direct DB edit or a future
  "void & reissue" feature. Integrity over convenience.

---

## Part 1 — Glitch 1: member label
**File:** `src/pages/PaymentsPage.tsx`
- `STATUS_CONFIG` (line 11): add a `bank_reconciled` entry identical to `confirmed` — label
  **"Dikonfirmasi"**, green, check icon. The fallback at line 156 (`?? STATUS_CONFIG.submitted`)
  then never triggers for a real reconciled payment.

Result: member sees the same green "Dikonfirmasi" before and after reconcile.

---

## Part 2 — Glitch 2: totals count `bank_reconciled` too
**File:** `src/lib/queries.ts` — broaden each `status = 'confirmed'` check to
`status IN ('confirmed','bank_reconciled')` at:
- line 677 — `fetchPaymentSummaryReport` (donation ledger join)
- lines 727, 746, 763 — member Rekap summary (iuran + donation "unallocated confirmed" branches)
- line 898 — `fetchMemberIuranPaid`
- line 940 — `fetchPaymentTotals` fallback
- lines 964, 967 — `fetchFundTotals` (the admin "Iuran Terkonfirmasi" card)
- line 1885 — the other summary report

**Supabase function:** `supabase/migrations/20260623_fund_totals_rpc.sql` — lines 33 and 43, same
broadening. Must be **re-run in the Supabase SQL editor** after editing (it's a DB function). App
falls back gracefully if not updated, so deploy order is forgiving.

Result: reconciling never changes any total.

---

## Part 3 — Option B: allocation required before confirm, frozen after

### 3a. Confirming requires a complete allocation
**File:** `src/pages/admin/AdminPayments.tsx` (EditDrawer)
- Full-allocation guard already exists (`remaining === 0`, line 397). Reuse it.
- When the chosen status is `confirmed`, the main "Simpan" mutation (line 169) must: (1) block if
  `remaining !== 0` or type-mismatch not acknowledged, then (2) save allocation **and** set status to
  `confirmed` in one action (`savePaymentAllocations` then `updatePaymentAdmin`).
  `savePaymentAllocations` already does delete+insert replace, so this is safe.
- Non-confirmed statuses keep allocation optional.

### 3b. Freeze a confirmed/reconciled payment (read-only drawer)
- When `payment.status` is `confirmed` or `bank_reconciled`, render the drawer read-only: disable the
  amount field, status dropdown, allocation rows, and both save buttons; show allocation as a summary.

### 3c. One-way status
- The status dropdown (lines 251–254) only offers legal transitions from the current status. Once
  `confirmed`/`bank_reconciled`, no path back to submitted/pending_review/rejected.

### 3d. Database hardening (recommended) — new dated migration in `supabase/migrations/`
- Trigger on `payments`: reject any status change out of `confirmed` except `confirmed →
  bank_reconciled` (same pattern as existing `prevent_member_status_change`).
- Trigger on `account_transactions`: block insert/update/delete when the linked payment is already
  `confirmed`/`bank_reconciled`.

---

## Suggested order
1. Part 1 (member label) — trivial, ship independently. ← in progress
2. Part 2 (broaden totals + re-run the Supabase function) — fixes the visible 770K bug.
3. Part 3a–3c (drawer: require allocation, freeze, one-way).
4. Part 3d (DB triggers) — enforcement hardening.

## Verification
- `npm run lint` (tsc --noEmit) after code parts.
- Supabase function + triggers verified by applying them in the SQL editor.
