# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Class of '87 Reunion Portal** — Alumni reunion website for the Class of 1987 (SMA Negeri 3 Bandung). React 19 + Vite + TypeScript SPA with Supabase for auth, database, storage, and edge functions. Dark luxury aesthetic with glassmorphism UI; most user-facing copy is in Indonesian.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Vite dev server on port 3000 (0.0.0.0 for network)
npm run build        # Production build → dist/
npm run preview      # Preview production build
npm run lint         # TypeScript type-check (tsc --noEmit) — there is NO test suite
npm run clean        # Remove dist/
```

There are no automated tests. `npm run lint` (type-check) is the only programmatic gate — run it after changes.

### Environment Setup

Create `.env.local` with:
```
GEMINI_API_KEY=...
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

`GEMINI_API_KEY` is injected at build time via `process.env` (Vite `define`). Supabase vars use the standard `import.meta.env.VITE_*` prefix and are read at runtime in `src/lib/supabase.ts`.

## Architecture

### Routing & Layouts

`App.tsx` wraps everything in `ThemeProvider` → `AuthProvider`, then uses React Router v7 with two layouts:
- **`MainLayout`** — public + member pages, wraps the navbar/footer shell
- **`AdminLayout`** — fixed collapsible sidebar; redirects to `/` unless `isAdmin || isFinanceAdmin`

`/` is `RootRoute`: a public teaser landing for logged-out visitors; logged-in users are redirected to `/home` (the real member landing).

Route access tiers enforced by `ProtectedRoute` (`requireApproved` prop):
1. **Public** — `/`, `/about`, `/charters`, `/charters/:slug`, `/yearbook/:year`, `/anggaran`, `/faq`, `/pengumuman`
2. **Authenticated (any status)** — `/home`, `/register`, `/pending`, `/profile`
3. **Approved members only** (`requireApproved`) — `/directory`, `/gallery`, `/submit`, `/members/:id`, `/payments`, `/merchandise`, `/orders`
4. **Admin** — `/admin/*` (checked inside `AdminLayout`)

`ProtectedRoute` also enforces **registration completeness**: a signed-in user whose `profile.city` is empty is bounced to `/register`. `requireApproved` routes bounce non-approved users to `/pending`.

Auth flow: Google OAuth via Supabase → `/auth/callback` → `/register` (fill profile) → `status='pending'` → admin approves → `status='approved'`.

### Auth & Profiles

`AuthContext` (`src/contexts/AuthContext.tsx`) is the single source of truth:
- `user` — Supabase `User` (JWT identity)
- `profile` — `profiles` table row (extended over time: `name, phone, bio, avatar_url, city, profession, status, is_super_admin, nickname`, plus payment/merch fields)
- `loading` — true until `getSession()` resolves (hard 6s fallback timeout)
- Auth state changes skip `INITIAL_SESSION` and `TOKEN_REFRESHED` to avoid flash/race

`ThemeContext` (`src/contexts/ThemeContext.tsx`) provides the light/dark toggle (`theme`, `toggleTheme`), persisted to `localStorage`.

### Admin RBAC — three tiers

`useAdminStatus()` (`src/hooks/useAdminStatus.ts`) extends auth by querying `charter_admins` and `finance_admins`:
- `isSuperAdmin` — from `profile.is_super_admin`
- `isAdmin` — super admin OR has rows in `charter_admins`
- `isFinanceAdmin` — super admin OR has rows in `finance_admins` (bank reconciliation + financial reports)
- `charterIds` — charters this user admins (empty for super admin → they see all)

`AdminLayout` renders three nav groupings:

| Section | Sample routes | Who |
|---------|--------|-----|
| Charter Admin | `/admin`, `/admin/members`, `/admin/cms` | Charter admin + super admin |
| Super Admin | `/admin/site`, `/admin/site-cms`, `/admin/content`, `/admin/all-members`, `/admin/roles`, `/admin/charters`, `/admin/media`, `/admin/payments`, `/admin/merchandise`, `/admin/orders`, `/admin/keringanan`, `/admin/expenses` | Super admin only |
| Finance-only | `/admin/bank-rekon`, `/admin/financial` | Finance admin (sees ONLY these two if not also a charter/super admin) |

Charter admins only see members/media belonging to their assigned charters (enforced via `charterScope()` in queries and Supabase RLS).

### Data Layer

All Supabase queries live in `src/lib/queries.ts` (large file — search it before adding a query; many helpers already exist). The query key factory `qk` at the top is the single source of truth for TanStack Query cache keys — always use it for `useQuery`/`invalidateQueries`.

Admin queries take `(isSuperAdmin, charterIds)` and use `charterScope()` to filter by profile IDs when the admin is not super admin.

**Supabase tables** (defined under `supabase/migrations/`):
- Core: `profiles`, `charters`, `charter_members`, `charter_admins`, `finance_admins`, `media`, `media_charters`, `site_settings`, `audit_log`, `cms_content`
- Social: `profile_friends`, `media_comments`, `media_tags`
- Finance/commerce: `payments`, `payment_credits`, `merchandise`, `merchandise_orders`, `expenses`, `expense_categories`, `keringanan_requests`
- Ledger: `member_accounts`, `account_transactions`

Migrations are **phased and date-prefixed** (`YYYYMMDD_phaseN_*.sql` or `YYYYMMDD_<feature>.sql`); add new schema as a new migration file rather than editing old ones. Supabase **edge functions** live in `supabase/functions/` (e.g. `delete-member`).

### Storage Abstraction

`src/lib/storage.ts` supports three backends toggled via `site_settings.storage_backend`:
- **`supabase`** — Supabase Storage bucket `media` (bare path stored)
- **`vps`** — `https://media.top87.id/api/upload` (full HTTPS URL stored)
- **`r2`** — Cloudflare R2 worker at `site_settings.r2_worker_url` (default `https://media.top87.id`); full URL stored

`uploadFile()` dispatches to the active backend. `resolveMediaUrl(storagePath)` handles all: full `https://` URLs returned as-is, bare paths resolved via Supabase public URL — always use it when rendering media. **Payment receipts** (`uploadReceipt`) always go to Supabase Storage under a `receipts/` prefix regardless of the active backend.

### Design System

Custom Tailwind classes in `index.css`:
- `.glass` — glassmorphism (semi-transparent white + blur)
- `.glass-gold` — gold variant of glass
- `.gold-glow` — gold text shadow

CSS custom properties: `--color-charcoal` (#111111), `--color-navy` (#0A192F), `--color-gold` (#D4AF37), `--color-gold-light` (#F9E27D).

Typography: Playfair Display (headings), Inter (body). Animations via Motion library with `whileInView` + stagger pattern (`delay: index * 0.05`).

## Feature Domains (all implemented)

These were once planned and are now live — read the relevant page/query before extending:
- **Payments** — reunion fee + donations with QRIS, receipt upload, admin review states (`submitted → pending_review → confirmed → bank_reconciled` / `rejected`), payment credits (one member paying another's iuran), bank reconciliation, financial reports, expenses tracking, and a member-account ledger
- **Merchandise** — catalog, orders, t-shirt sizing, stock/cost tracking, admin order management
- **Keringanan / Permintaan Anggota** — member fee-relief requests (resubmittable after rejection) and special-needs tracking
- **Media** — multi-upload (20 photos or 3 videos per batch), comments, tags, charter association, admin moderation queue
- **CMS** — per-page editable content (`cms_content`) plus site-wide settings
- **Theme** — light/dark toggle (`ThemeContext`)
