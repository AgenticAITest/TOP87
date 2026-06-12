# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Class of '87 Reunion Portal** — Alumni reunion website for the Class of 1987 (SMA Negeri 3 Bandung). React 19 + Vite + TypeScript SPA with Supabase for auth, database, and storage. Dark luxury aesthetic with glassmorphism UI.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Vite dev server on port 3000 (0.0.0.0 for network)
npm run build        # Production build → dist/
npm run preview      # Preview production build
npm run lint         # TypeScript type-check (tsc --noEmit)
npm run clean        # Remove dist/
```

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

`App.tsx` uses React Router v7 with two layouts:
- **`MainLayout`** — public + member pages, wraps the navbar/footer shell
- **`AdminLayout`** — fixed sidebar, checks `useAdminStatus()` and redirects non-admins to `/`

Route access tiers enforced by `ProtectedRoute`:
1. **Public** — `/`, `/about`, `/charters`, `/charters/:slug`, `/yearbook/:year`
2. **Authenticated (any status)** — `/register`, `/pending`, `/profile`
3. **Approved members only** (`requireApproved`) — `/directory`, `/gallery`, `/submit`, `/members/:id`
4. **Admin** — `/admin/*` (checked in `AdminLayout` via `useAdminStatus`)

Auth flow: Google OAuth via Supabase → `/auth/callback` → `/register` (fill profile) → `status='pending'` → admin approves → `status='approved'`.

### Auth & Profiles

`AuthContext` (`src/contexts/AuthContext.tsx`) is the single source of truth:
- `user` — Supabase `User` (JWT identity)
- `profile` — `profiles` table row: `{ id, name, phone, bio, avatar_url, city, profession, status, is_super_admin }`
- `loading` — true until `getSession()` resolves (hard 6s fallback timeout)
- Auth state changes skip `INITIAL_SESSION` and `TOKEN_REFRESHED` to avoid flash/race

`useAdminStatus()` (`src/hooks/useAdminStatus.ts`) extends auth with:
- `isSuperAdmin` — from `profile.is_super_admin`
- `isAdmin` — super admin OR has rows in `charter_admins`
- `charterIds` — charters this user admins (empty for super admin → they see all)

### Data Layer

All Supabase queries live in `src/lib/queries.ts`. The query key factory `qk` is the single source of truth for TanStack Query cache keys — always use it for `useQuery`/`invalidateQueries`.

Admin queries accept `(isSuperAdmin, charterIds)` and use `charterScope()` to filter by profile IDs when the admin is not super admin.

**Supabase tables:** `profiles`, `charters`, `charter_members`, `charter_admins`, `media`, `site_settings`, `audit_log`

### Storage Abstraction

`src/lib/storage.ts` supports two backends toggled via `site_settings.storage_backend`:
- **`supabase`** — Supabase Storage bucket `media` (bare path stored)
- **`vps`** — `https://media.top87.id/api/upload` (full HTTPS URL stored)

`resolveMediaUrl(storagePath)` handles both: full `https://` URLs returned as-is, bare paths resolved via Supabase public URL. Always use this when rendering media.

### Admin RBAC

Two admin tiers with separate nav sections in `AdminLayout`:

| Section | Routes | Who |
|---------|--------|-----|
| Charter Admin | `/admin`, `/admin/members`, `/admin/media`, `/admin/cms` | Charter admin + super admin |
| Super Admin | `/admin/site`, `/admin/content`, `/admin/all-members`, `/admin/roles` | Super admin only |

Charter admins only see members/media belonging to their assigned charters (enforced via `charterScope` in queries and Supabase RLS).

### Design System

Custom Tailwind classes in `index.css`:
- `.glass` — glassmorphism (semi-transparent white + blur)
- `.glass-gold` — gold variant of glass
- `.gold-glow` — gold text shadow

CSS custom properties: `--color-charcoal` (#111111), `--color-navy` (#0A192F), `--color-gold` (#D4AF37), `--color-gold-light` (#F9E27D).

Typography: Playfair Display (headings), Inter (body). Animations via Motion library with `whileInView` + stagger pattern (`delay: index * 0.05`).

## Planned Features (from `Additional_requriements.txt`)

Not yet implemented — reference before building new features to avoid conflicts:
- Extended registration fields: nickname, birthdate, WhatsApp, reunion attendance
- Reunion + donation payments with QRIS and admin reconciliation
- Merchandise tracking with stock countdowns
- Daily WhatsApp status updates with budget/registration screenshots
- Light/dark theme toggle
- Comments on media posts
