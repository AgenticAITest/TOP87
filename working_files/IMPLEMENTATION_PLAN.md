# TOP87 Reunion Portal — Phased Implementation Plan

**Project:** Class of '87 Reunion Portal (SMA Negeri 3 Bandung)
**Stack:** React 19 + Vite + TypeScript + Supabase + Tailwind CSS
**Last Updated:** 2026-06-12 (session 3)

---

## Phase 0 — Design System, Shell Redesign & CMS Foundation ✅ COMPLETE
**Completed:** 2026-06-12

**Goal:** Implement the agreed dashboard design, wire all pages to a unified CMS, and
establish the feature-flag system — before building any new functional features.
All subsequent phases are built into this shell from day one.

**Reference design:** `working_files/new_design.html`

**What was delivered:**
- Warm parchment design system: `glass-card`, `parchment-bg`, `btn-primary` (orange), `btn-secondary` (forest green), Crimson Pro font, gold accent
- `MainLayout.tsx` full dark-green sidebar with phase-gated nav, feature-flag-driven Donasi/Merchandise links
- All member-facing pages reskinned (Landing, About, Charters, CharterDetail, Register, Gallery, Directory, MyProfile, MemberProfile, YearbookPage, SubmitMedia, Pending, NotFound)
- `cms_content` table migrated + `src/lib/cms.ts` + `usePageContent` hook; Landing, Anggaran, FAQ, Pengumuman all CMS-driven with hardcoded fallbacks
- `SiteCMSAdmin.tsx` at `/admin/site-cms` — field-level CMS editor for landing/anggaran/faq/pengumuman pages (JSON textarea editor; TipTap deferred)
- Feature flags toggle in `SiteAdmin.tsx`; sidebar Donasi/Merchandise links gated behind flags
- `useDashboardData.ts` hook; KPI cards render graceful empty states
- `AnggranPage.tsx`, `FAQPage.tsx`, `PengumumanPage.tsx` — new public static pages
- **Bonus:** `PublicLanding.tsx` — standalone public teaser page at `/`; dashboard moved to `/home`; unauthenticated visitors see no sensitive data

**Deviations from plan:**
- CMS admin built as new `/admin/site-cms` (SiteCMSAdmin) rather than rewriting `/admin/cms`; AdminCMS still handles charter-level CMS editing
- TipTap rich text editor not added — richtext fields use textarea for now; can be added in a future polish pass
- JSON list editor is a raw textarea (no add/row/reorder UI yet)

---

### 0.1 Design Decisions Locked In

| Element | Spec |
|---|---|
| Card background | `rgba(248, 244, 236, 0.85)` — warm cream, NOT white |
| Main page background | `#f4efdf` + paper-fibers texture, fixed attachment |
| Sidebar background | `#0d2b1f` dark forest green + subtle leather texture overlay |
| Primary CTA | Orange gradient `#c67119 → #a35a12` |
| Secondary CTA | Dark green `#0d2b1f` |
| Heading font | Crimson Pro (serif) — or Playfair Display as fallback |
| Body font | Inter |
| Gold accent | `#d4af37` |
| Card border | `rgba(212, 175, 55, 0.15)` — faint gold tint |
| Table dividers | `border-amber-100/200` — warm, not cold grey |

---

### 0.2 Database Changes

#### CMS Content Table
Replaces the ad hoc `site_settings` keys used for page content. All page text and
images are stored here. `site_settings` is retained only for operational config
(storage backend, feature flags, QRIS details, WA bot settings).

```sql
CREATE TABLE cms_content (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key     TEXT NOT NULL,       -- 'landing' | 'about' | 'faq' | 'anggaran' | etc.
  section_key  TEXT NOT NULL,       -- 'hero' | 'intro' | 'budget_items' | etc.
  field_key    TEXT NOT NULL,       -- 'title' | 'subtitle' | 'image_url' | 'body' | etc.
  content_type TEXT NOT NULL        -- 'text' | 'richtext' | 'image_url' | 'json'
                CHECK (content_type IN ('text', 'richtext', 'image_url', 'json')),
  value        TEXT,
  updated_by   UUID REFERENCES profiles(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (page_key, section_key, field_key)
);

-- Super admin only: full CRUD
-- Charter admins: UPDATE only on their charter's page_key (enforced via RLS)
```

#### CMS Content Map (all editable fields at launch)

| page_key | section_key | field_key | content_type | Notes |
|---|---|---|---|---|
| `landing` | `hero` | `image_url` | image_url | Hero background image |
| `landing` | `hero` | `title` | text | "Sekarang Aku Menjadi Dewasa" |
| `landing` | `hero` | `subtitle` | text | Italic quote below title |
| `landing` | `hero` | `date` | text | "29 – 30 April 2027" |
| `landing` | `hero` | `venue` | text | "Bandung / Ciwidey" |
| `landing` | `hero` | `cta_primary_label` | text | "Daftar Sekarang" |
| `landing` | `hero` | `cta_secondary_label` | text | "Pesan Merchandise" |
| `landing` | `reunion` | `date_iso` | text | ISO date for countdown timer |
| `landing` | `reunion` | `quota_target` | text | "122" |
| `about` | `hero` | `image_url` | image_url | About page hero |
| `about` | `hero` | `title` | text | |
| `about` | `intro` | `body` | richtext | School history intro |
| `about` | `story` | `body` | richtext | Class story body |
| `faq` | `items` | `data` | json | Array of `{q, a}` objects |
| `anggaran` | `items` | `data` | json | Array of `{no, keterangan, total, per_orang}` |
| `anggaran` | `notes` | `body` | text | Footer note below table |
| `yearbook` | `1987` | `title` | text | |
| `yearbook` | `1987` | `body` | richtext | |
| `yearbook` | `1987` | `asset_url` | image_url | PDF or image |
| `yearbook` | `2026` | `title` | text | |
| `yearbook` | `2026` | `body` | richtext | |
| `yearbook` | `2026` | `asset_url` | image_url | Video or image |
| `register` | `intro` | `title` | text | Registration page welcome title |
| `register` | `intro` | `body` | text | Instructional text |
| `pending` | `intro` | `title` | text | Awaiting approval title |
| `pending` | `intro` | `body` | richtext | Explanation text |
| `charter:{slug}` | `hero` | `image_url` | image_url | Per-charter hero (dynamic key) |
| `charter:{slug}` | `hero` | `description` | richtext | Per-charter description |
| `charter:{slug}` | `hero` | `announcement` | text | Per-charter announcement banner |

> **Charter pages** use dynamic `page_key = 'charter:bandung'` etc. Charter admins
> can edit only their own charter's keys (enforced via RLS policy checking the slug).

#### site_settings Keys Retained (operational config only)
| Key | Purpose |
|---|---|
| `storage_backend` | `'supabase'` or `'vps'` |
| `feature_flags` | JSON: `{ "donations": false, "merchandise": false }` |
| `featured_members_mode` | `'random'` or `'manual'` |
| `featured_members_list` | JSON array of profile IDs |
| `featured_members_interval` | Rotation interval in ms |

> All content-related keys previously in `site_settings`
> (`hero_poster_url`, `budget_items`, `faq_items`, `about_*`, `yearbook_*`)
> are migrated to `cms_content`.

---

### 0.3 CMS Hook & Utilities

- [ ] `src/lib/cms.ts` — CMS query functions:
  - `fetchPageContent(pageKey)` — returns all fields for a page as a flat `Record<string, string>`
  - `upsertField(pageKey, sectionKey, fieldKey, value)` — admin write
  - `uploadCmsImage(file, pageKey, sectionKey)` — wraps existing storage abstraction, stores URL back to `cms_content`
- [ ] `src/hooks/usePageContent.ts` — `usePageContent(pageKey)` hook using TanStack Query; returns `{ content, isLoading }`; add `qk.cms(pageKey)` to the key factory
- [ ] All pages read their text/images via `usePageContent` — hardcoded strings become fallback defaults only (shown when CMS row doesn't exist yet)

---

### 0.4 Unified CMS Admin UI

Replaces the current scattered `AdminCMS.tsx` and `ContentAdmin.tsx`.
Single entry point at `/admin/cms` organized by page.

- [ ] `AdminCMS.tsx` (rewrite) — unified CMS editor:
  - Left panel: page list (Landing, About, FAQ, Anggaran, Yearbook, Register, Pending, Charters)
  - Right panel: editable fields for selected page, grouped by section
  - Field renderers by `content_type`:
    - `text` → single-line input
    - `richtext` → TipTap rich text editor (add `@tiptap/react` dependency)
    - `image_url` → image preview + upload button (uses `uploadCmsImage`)
    - `json` → structured list editor (add/edit/delete/reorder rows) for FAQ and budget items
  - Save button per section (not per field) — batches upserts
  - "Reset to default" per field — deletes the CMS row, page falls back to hardcoded default
  - Charter admins see only their charter's page in the page list
  - Super admins see all pages

- [ ] `AdminLayout.tsx` — update CMS link to point to new unified `/admin/cms`
- [ ] `App.tsx` — ensure `/admin/cms` route is registered
- [ ] Add `@tiptap/react`, `@tiptap/starter-kit` to `package.json`

---

### 0.5 Tailwind / CSS Tasks

- [ ] Update `index.css` — replace `.glass` / `.glass-gold` with `.warm-card` (`rgba(248,244,236,0.85)` + amber border)
- [ ] Update `index.css` — update `--color-charcoal`, `--color-navy` to sidebar green `#0d2b1f`
- [ ] Add `--color-parchment: #f4efdf` and `--color-parchment-dark: #ede8d5` CSS variables
- [ ] Add `.parchment-bg` utility (background color + paper-fibers texture)
- [ ] Add `.btn-primary` (orange gradient) and `.btn-secondary` (dark green) global styles
- [ ] Add `@import` for Crimson Pro from Google Fonts

---

### 0.6 Layout Shell Tasks

- [ ] `MainLayout.tsx` — redesign to new sidebar shell (dark green, phase-gated nav, user profile at bottom with notification bell)
- [ ] `Navbar.tsx` — replace top navbar with sidebar-integrated user profile block
- [ ] `AdminLayout.tsx` — update sidebar to match new design system; retain admin nav items
- [ ] `Footer.tsx` — parchment footer with shamrock + "Dari kita, oleh kita, untuk kita" tagline

---

### 0.7 Sidebar Navigation — Phase-Gated Links

| Sidebar Item | Available From | Behaviour Before That Phase |
|---|---|---|
| Dashboard | Phase 0 | Always visible |
| Anggaran & Transparansi | Phase 0 | Always visible (static CMS page) |
| Pengumuman | Phase 0 | Always visible |
| FAQ | Phase 0 | Always visible (static CMS page) |
| Donasi | Phase 2 | Hidden until `feature_flags.donations = true` |
| Merchandise | Phase 3 | Hidden until `feature_flags.merchandise = true` |

- [ ] `MainLayout.tsx` / sidebar — read `feature_flags` from `site_settings`; conditionally render Donasi and Merchandise links
- [ ] `SiteAdmin.tsx` — Feature Flags section: toggle switches for "Donasi enabled" and "Merchandise enabled"

---

### 0.8 Dashboard KPI Cards — Empty States

| Widget | Phase 0 State | Activates In |
|---|---|---|
| Kehadiran Alumni | Shows approved member count only; no attendance breakdown | Phase 1 |
| Total Dana Terkumpul | "Rp 0 — Pembayaran belum dibuka"; no progress bar | Phase 2 |
| Merchandise Terpesan | "Merchandise belum tersedia"; no item list | Phase 3 |
| Pendaftaran Terbaru — payment badges | Registrations shown without Lunas/Pending badges | Phase 2 |
| Bantu Teman Angkatan widget | Hidden entirely | Phase 2 |
| Galeri Nostalgia comment quote | Gallery thumbnails only; no quote | Phase 4 |
| Countdown timer | Live — reads `landing › reunion › date_iso` from CMS | Phase 0 ✅ |
| Budget table | Live — reads `anggaran › items › data` from CMS | Phase 0 ✅ |

- [ ] `src/hooks/useDashboardData.ts` — centralises all dashboard queries; returns null/empty for features not yet active; dashboard never errors when tables don't exist
- [ ] `Landing.tsx` / Dashboard — implement conditional rendering per widget using `useDashboardData` + `feature_flags`

---

### 0.9 New Static Pages

Both pages are fully CMS-driven via `usePageContent`. No new schema beyond `cms_content`.

- [ ] `AnggranPage.tsx` — `/anggaran`: full budget transparency table; reads `anggaran › items › data` (JSON) and `anggaran › notes › body` from CMS
- [ ] `FAQPage.tsx` — `/faq`: accordion FAQ list; reads `faq › items › data` (JSON) from CMS
- [ ] `App.tsx` — register `/anggaran` and `/faq` as public routes

---

### 0.10 Page Reskin Tasks (CMS-wired + new styling)

All pages read editable content via `usePageContent`. Hardcoded strings become fallback
defaults only. Styling updated to warm cream cards throughout.

- [ ] `Landing.tsx` — full dashboard: hero (CMS) + KPI cards (empty states) + 3-col middle grid + budget table (CMS) + right column; all text via CMS
- [ ] `About.tsx` — CMS-wired hero, intro, story sections; warm styling
- [ ] `ChaptersPage.tsx` — warm card grid
- [ ] `CharterDetail.tsx` — CMS-wired hero image, description, announcement per charter; warm styling
- [ ] `MemberProfile.tsx` — warm profile card
- [ ] `Directory.tsx` + `MemberDirectory.tsx` — warm card backgrounds, amber borders
- [ ] `Gallery.tsx` — warm card treatment on media grid
- [ ] `MyProfile.tsx` — warm form card styling
- [ ] `Register.tsx` — CMS-wired intro text; warm form card styling
- [ ] `YearbookPage.tsx` — CMS-wired content per year section; warm styling
- [ ] `Pending.tsx` — CMS-wired title + body; warm card styling
- [ ] `NotFound.tsx` — warm card styling
- [ ] All admin pages (`Dashboard`, `AdminMembers`, `AdminMedia`, etc.) — warm card backgrounds, retain admin layout

---

### 0.11 Exit Criteria

- All pages use warm cream card backgrounds; no cold white cards remain
- Every page text and image is editable from `/admin/cms` without touching code
- Charter admins can edit their own charter page only; super admin edits all pages
- Sidebar shows only phase-appropriate nav items (Donasi + Merchandise hidden)
- Dashboard KPI cards render graceful empty states; no errors or broken zeros
- Anggaran & FAQ pages live and fully editable from CMS admin
- Countdown timer reads date from CMS
- Budget table reads line items from CMS
- Feature flags toggle in SiteAdmin correctly shows/hides Donasi and Merchandise nav items
- `@tiptap/react` rich text editor working for richtext fields

---

## Phase 1 — Profile Completeness ✅ COMPLETE
**Completed:** 2026-06-12

**Goal:** Capture all reunion-relevant member data. Extends existing registration + profile pages.

### Dashboard Widgets Activated
- **Kehadiran Alumni** — upgrades to show attendance breakdown (yes / most likely / undecided / no)

### Database Changes
```sql
ALTER TABLE profiles ADD COLUMN nickname TEXT;
ALTER TABLE profiles ADD COLUMN birthdate DATE;
ALTER TABLE profiles ADD COLUMN whatsapp TEXT;
ALTER TABLE profiles ADD COLUMN reunion_attendance TEXT
  CHECK (reunion_attendance IN ('yes', 'most_likely', 'undecided', 'no'));
ALTER TABLE profiles ADD COLUMN reunion_no_reason TEXT;
ALTER TABLE profiles ADD COLUMN funny_event TEXT;
ALTER TABLE profiles ADD COLUMN message_to_friends TEXT;

CREATE TABLE profile_friends (
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rank       INTEGER CHECK (rank BETWEEN 1 AND 3),
  PRIMARY KEY (profile_id, rank)
);
```

### Frontend Tasks
- [ ] `Register.tsx` — add nickname, birthdate, WhatsApp, reunion attendance with conditional reason field
- [ ] `MyProfile.tsx` — add same new fields; friend selector (search approved members, pick up to 3)
- [ ] `MemberProfile.tsx` — display nickname, funny_event, message_to_friends on public profile
- [ ] `MemberDirectory.tsx` — show reunion attendance badge (visible to admins and self only)
- [ ] `Landing.tsx` — upgrade Kehadiran Alumni card to show attendance breakdown
- [ ] `AdminDashboard.tsx` — attendance breakdown stats
- [ ] `AllMembers.tsx` — add reunion_attendance column + filter
- [ ] `ThemeContext.tsx` — light/dark mode context, persisted to localStorage
- [ ] `index.css` + components — add `dark:` Tailwind variants
- [ ] Sidebar — add theme toggle (sun/moon icon)

### Exit Criteria
- Full profile including attendance intent captured at registration and editable in profile
- Kehadiran Alumni dashboard card shows live attendance breakdown
- Light/dark theme persists across sessions

---

## Phase 2 — Payments (Reunion Fees + Donations) ✅ COMPLETE
**Completed:** 2026-06-12

**Goal:** Full payment tracking loop — static QRIS, member self-reporting, receipt upload, admin reconciliation.

### Dashboard Widgets Activated
- **Total Dana Terkumpul** — live confirmed payment sum
- **Pendaftaran Terbaru** — Lunas/Pending badges appear
- **Bantu Teman Angkatan** — donation progress widget revealed
- **Donasi** sidebar link — `feature_flags.donations = true`

### Pre-Phase Decisions Required
1. Single QRIS for both fees + donations, or separate accounts? = Single account. Not only QRIS, but also text info on the account, like account number, bank name, and account holder name.
2. Does receipt submission auto-set `pending_review`, or requires explicit admin action? = member upload the payment receipt and amount, no need to have pending. admin can then set the amount after reconciliation if the amount entered by the user is incorrect.
3. Are partial/instalment payments allowed for reunion fees? = yes

### Database Changes
```sql
-- site_settings keys added:
-- qris_image_url, qris_bank_name, qris_account_no, qris_account_name
-- reunion_fee_target, donation_target

CREATE TYPE payment_type AS ENUM ('reunion_fee', 'donation');
CREATE TYPE payment_status AS ENUM ('submitted', 'pending_review', 'confirmed', 'rejected');

CREATE TABLE payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type                  payment_type NOT NULL,
  member_amount         BIGINT NOT NULL,
  admin_adjusted_amount BIGINT,
  receipt_url           TEXT,
  status                payment_status NOT NULL DEFAULT 'submitted',
  member_notes          TEXT,
  admin_notes           TEXT,
  reviewed_by           UUID REFERENCES profiles(id),
  reviewed_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX payments_profile_id_idx ON payments(profile_id);
CREATE INDEX payments_type_idx ON payments(type);
CREATE INDEX payments_status_idx ON payments(status);
```

### Frontend Tasks

**Member-facing:**
- [ ] `QRISModal.tsx` — QR image, bank details, Download button, amount input, receipt upload, submit
- [ ] `PaymentsPage.tsx` — `/payments`: tabs Reunion Fee / Donation; payment history; Make Payment button
- [ ] `App.tsx` — add `/payments` route (requireApproved)

**Dashboard upgrades:**
- [ ] `Landing.tsx` — replace Total Dana Terkumpul empty state with live sum
- [ ] `Landing.tsx` — add payment status badges to Pendaftaran Terbaru
- [ ] `Landing.tsx` — reveal Bantu Teman Angkatan widget
- [ ] `useDashboardData.ts` — add payment aggregate queries

**Admin-facing:**
- [ ] `AdminPayments.tsx` — `/admin/payments`: filterable list; editable `admin_adjusted_amount`; status dropdown; receipt preview
- [ ] `AdminLayout.tsx` — add Payments to Charter Admin nav
- [ ] `SiteAdmin.tsx` — QRIS config section; set `feature_flags.donations = true`
- [ ] `AdminDashboard.tsx` — payment summary widget

**Queries:**
- [ ] `queries.ts` — `fetchMyPayments`, `fetchAdminPayments`, `submitPayment`, `updatePaymentAdmin`, QRIS getters/setters
- [ ] `qk` factory — `qk.payments(profileId)`, `qk.adminPayments()`

### Exit Criteria
- Member can view QRIS, enter amount, upload receipt, view history
- Admin can reconcile amounts and update payment status
- Dashboard Total Dana Terkumpul, payment badges, and Donasi widget all live

---

## Phase 3 — Merchandise ✅ COMPLETE
**Completed:** 2026-06-12

**Goal:** Merch catalog with stock countdowns, reusing Phase 2 payment flow.

### Dashboard Widgets Activated
- **Merchandise Terpesan** — live confirmed order counts per item
- **Merchandise teaser** in middle grid — shows real items from DB
- **Merchandise** sidebar link — `feature_flags.merchandise = true`

### CMS Addition
- [ ] `AdminCMS.tsx` — add `merchandise` page section: item name, description, image (per item managed via AdminMerchandise, not CMS — CMS handles page-level intro text only)
- Add to cms_content map: `merchandise › intro › title`, `merchandise › intro › body`

### Database Changes
```sql
CREATE TABLE merchandise (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  image_url   TEXT,
  price       BIGINT NOT NULL,
  stock_total INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE order_status AS ENUM ('submitted', 'pending_review', 'confirmed', 'rejected', 'shipped');

CREATE TABLE merchandise_orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  merchandise_id        UUID NOT NULL REFERENCES merchandise(id),
  quantity              INTEGER NOT NULL DEFAULT 1,
  member_amount         BIGINT NOT NULL,
  admin_adjusted_amount BIGINT,
  receipt_url           TEXT,
  status                order_status NOT NULL DEFAULT 'submitted',
  member_notes          TEXT,
  admin_notes           TEXT,
  shipping_address      TEXT,
  reviewed_by           UUID REFERENCES profiles(id),
  reviewed_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Frontend Tasks

**Member-facing:**
- [ ] `MerchandisePage.tsx` — `/merchandise`: item grid with stock countdown, "Pesan Sekarang" button; page intro text from CMS
- [ ] `MerchOrderModal.tsx` — quantity, shipping address, QRIS → amount → receipt (reuses QRISModal)
- [ ] `MyOrdersPage.tsx` — `/orders`: order history with status badges
- [ ] `App.tsx` — add `/merchandise` and `/orders` routes (requireApproved)

**Dashboard upgrades:**
- [ ] `Landing.tsx` — replace Merchandise Terpesan empty state with live counts
- [ ] `Landing.tsx` — replace Merchandise teaser placeholder with real DB items
- [ ] `useDashboardData.ts` — add merchandise aggregate queries

**Admin-facing:**
- [ ] `AdminMerchandise.tsx` — `/admin/merchandise`: add/edit/deactivate items, stock management, sold counts
- [ ] `AdminOrders.tsx` — `/admin/orders`: reconciliation UI + shipping status (same pattern as AdminPayments)
- [ ] `AdminLayout.tsx` — add Merchandise and Orders links
- [ ] `SiteAdmin.tsx` — set `feature_flags.merchandise = true`

### Exit Criteria
- Members browse live catalog with real stock counts
- Purchase flow reuses QRIS modal from Phase 2
- Admin manages inventory and reconciles orders
- Merchandise Terpesan dashboard card live

---

## Phase 4 — Engagement & Countdowns ✅ COMPLETE
**Completed:** 2026-06-12

**Goal:** Gallery comments, live progress countdowns, all dashboard widgets fully live.

### Dashboard Widgets Activated
- **Galeri Nostalgia** — shows latest real comment quote (live from DB)
- **Progress Reuni** — Dana Terkumpul progress bar + per-item merch stock bars
- All KPI cards now showing 100% live data — no empty states remain

### Database Changes
```sql
CREATE TABLE media_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id   UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body       TEXT NOT NULL CHECK (char_length(body) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX media_comments_media_id_idx ON media_comments(media_id);

-- site_settings key:
INSERT INTO site_settings (key, value) VALUES ('budget_total_target', '247000000');
```

### What was delivered
- `MediaComments.tsx` — comment list (avatar, name, timeAgo in Indonesian) + add comment form; Enter to submit; 500 char limit; owner/admin delete; invalidates `qk.latestComment()` on change
- `Gallery.tsx` — `MediaComments` embedded in lightbox below caption; two-wrapper scroll fix (outer `overflow-y-auto`, centering wrapper `flex min-h-full items-center justify-center`)
- `Gallery.tsx` — **Prev/Next navigation**: ←/→ arrow buttons, swipe gesture (>50px), keyboard `ArrowLeft`/`ArrowRight`, image counter "N / total", slide+fade `AnimatePresence` with direction-aware x offset; loops at ends
- `AdminMedia.tsx` — "Komentar" toggle button on approved cards; inline `MediaComments` expands
- `Landing.tsx` — Galeri Nostalgia shows live latest comment body + profile name from `fetchLatestComment()`
- `Landing.tsx` — "Progress Reuni" section: Dana Terkumpul animated progress bar (flag-gated), per-item merch stock bars (flag-gated)
- `useDashboardData.ts` — added `latestComment` and `budgetTarget` to `DashboardData` interface and Promise.all
- `queries.ts` — added `fetchLatestComment()`, `fetchBudgetTarget()`, `fetchComments()`, `addComment()`, `deleteComment()`, `qk.comments(mediaId)`, `qk.latestComment()`
- **Attendance label** — "InshaAllah hadir" → "Berencana Hadir" across all 5 files (Landing, Register, MyProfile, AllMembers × 2, panduan-anggota.md)

### Deviations from plan
- `CountdownWidgets.tsx` not created as a separate component — countdown widgets implemented inline in `Landing.tsx` (simpler, no reuse needed elsewhere)
- CMS addition for `gallery › intro` not implemented — deferred as not needed for Phase 4 functionality

### Exit Criteria ✅
- Approved members can comment on gallery posts; admins/owners can delete
- Gallery lightbox supports prev/next navigation (desktop arrows, mobile swipe, keyboard)
- All dashboard KPI cards show live data — zero empty states remain
- Landing page shows live Dana Terkumpul progress and per-item merch stock

---

## Phase 4b — Financial Report & User Manual ✅ COMPLETE
**Completed:** 2026-06-12

**Goal:** Operational transparency for super admin — unified financial view and role-aware in-app help system.

> These features were added outside the original phased plan in response to growing app complexity.

### What was delivered

#### Admin Financial Report (`/admin/financial`, super admin only)
- Unified view merging `payments` and `merchandise_orders` into a single sortable `FinancialReportRow[]`
- Summary cards: Total Iuran, Donasi, Merch Harga Jual, Merch Margin
- Filters: text search, date from/to, type chips (`reunion_fee`, `donation`, `merchandise`), status chips (dynamic per data), charter dropdown
- Table: 9 columns including Harga Jual and Margin (merch-only columns); totals footer row
- `AdminLayout.tsx` — "Lap. Keuangan" link with `BarChart3` icon added to Super Admin nav section
- `queries.ts` — `fetchFinancialReport()`, `pickCharter()` helper, `FinancialReportRow` type, `qk.financialReport()`

#### Help Modal (`?` floating button, both layouts)
- `HelpModal.tsx` — role-aware: shows tabs for member / charter admin / super admin based on `useAdminStatus()`; defaults to highest privilege tab available
- Markdown source files in `src/docs/`: `panduan-anggota.md`, `panduan-charter-admin.md`, `panduan-super-admin.md` — all in Indonesian
- Left TOC sidebar with anchor links; right scrollable `marked`-rendered prose
- `src/vite-env.d.ts` — added `*.md?raw` module declaration for Vite raw imports
- `src/index.css` — added `.help-prose` styles (h1–h4, p, ul, ol, li, code, pre, blockquote, table, a)
- Floating `?` button: `fixed bottom-6 right-6 z-40` in `MainLayout`; Help button in `AdminLayout` sidebar footer
- `Escape` key closes

### Exit Criteria ✅
- Super admin can view all financial transactions in one filtered list
- All three user roles have an in-app guide accessible without leaving the app
- Help content is role-gated (members cannot see admin docs)

---

## Phase 5 — WhatsApp Status Bot
**Goal:** Automated daily status update at 17:00 WIB. Backend microservice, decoupled from React app.

### Infrastructure
- Node.js service on existing VPS (`node-cron` or system cron)
- Puppeteer headless browser for dashboard screenshots
- WhatsApp API provider (e.g. Fonnte)

### Tasks
- [ ] Node.js cron service — fires daily at 10:00 UTC (17:00 WIB)
- [ ] Puppeteer — authenticate to admin dashboard, screenshot budget + registration widgets
- [ ] WhatsApp API — send screenshots to configured numbers
- [ ] `SiteAdmin.tsx` — WA target numbers config + enable/disable toggle
- [ ] `site_settings` — add `wa_bot_enabled` (boolean), `wa_target_numbers` (comma-separated)

### Exit Criteria
- Bot sends screenshots daily at 17:00 WIB without manual intervention
- Admin controls target numbers and on/off toggle from Site Admin panel

---

## Cross-Cutting Concerns

### RLS Policies (per phase)
| Phase | Table | Policy |
|---|---|---|
| 0 | `cms_content` | Super admin: full CRUD. Charter admin: UPDATE rows where `page_key = 'charter:{their_slug}'` only. Members: SELECT only. |
| 0 | `site_settings` | Super admin: full CRUD. Others: SELECT only. |
| 1 | `profile_friends` | Members: INSERT/UPDATE/DELETE own rows only. Others: SELECT approved members' friends. |
| 2 | `payments` | Members: SELECT/INSERT own rows. Admins: SELECT/UPDATE within charter scope. |
| 3 | `merchandise` | Public: SELECT active items. Super admin: full CRUD. |
| 3 | `merchandise_orders` | Same scope rules as `payments`. |
| 4 | `media_comments` | Approved members: INSERT. Owner or admin: DELETE. All approved: SELECT. |

### Storage Buckets (per phase)
| Phase | Bucket | Access |
|---|---|---|
| 0 | `cms-images` | Public read; admin write (for CMS image uploads) |
| 2 | `payment-receipts` | Private; member upload own receipts, admin read all |
| 3 | `merchandise-images` | Public read; admin write (managed via AdminMerchandise) |

### Audit Log Extensions
| Phase | Events Logged |
|---|---|
| 0 | CMS field updated (page_key, section_key, field_key, updated_by) |
| 2 | Payment submitted, reconciled, status changed |
| 3 | Order submitted, reconciled, merchandise stock updated |
| 4 | Comment deleted by admin |

---

## Dashboard Widget Activation Summary

| Widget | Ph 0 | Ph 1 | Ph 2 | Ph 3 | Ph 4 |
|---|---|---|---|---|---|
| Kehadiran Alumni (count only) | ✅ | ✅ +breakdown | ✅ | ✅ | ✅ |
| Total Dana Terkumpul | ⬜ empty | ⬜ empty | ✅ live | ✅ | ✅ |
| Merchandise Terpesan | ⬜ empty | ⬜ empty | ⬜ empty | ✅ live | ✅ |
| Pendaftaran payment badges | ⬜ hidden | ⬜ hidden | ✅ live | ✅ | ✅ |
| Bantu Teman Angkatan | ⬜ hidden | ⬜ hidden | ✅ revealed | ✅ | ✅ |
| Galeri Nostalgia comment | ⬜ thumbs only | ⬜ thumbs only | ⬜ thumbs only | ⬜ thumbs only | ✅ live |
| Countdown timer | ✅ CMS | ✅ | ✅ | ✅ | ✅ |
| Budget table | ✅ CMS | ✅ | ✅ | ✅ | ✅ |
| Donasi sidebar link | ⬜ hidden | ⬜ hidden | ✅ flag | ✅ | ✅ |
| Merchandise sidebar link | ⬜ hidden | ⬜ hidden | ⬜ hidden | ✅ flag | ✅ |

---

## Phase 6 — Cloudflare R2 Storage, CDN & Traffic Scaling
**Goal:** Move all media storage to Cloudflare R2 (zero egress cost), serve assets through Cloudflare's global CDN for fast worldwide delivery, and harden the site against traffic spikes (event announcements, reunion day). Fully decouples media cost from Hostinger plan tier.

---

### 6.1 Architecture Overview

```
Browser
  │
  ├─ React SPA (static files) ──► Cloudflare Pages  [global CDN, auto-scaling]
  │
  ├─ API calls ─────────────────► Supabase           [auth, DB, RLS — unchanged]
  │
  └─ Media (images / videos) ───► Cloudflare R2      [zero-egress object storage]
                                      │
                                  Custom domain
                               media.top87.id
                                      │
                               Cloudflare CDN         [edge cache, image resize]
```

- **R2** replaces Supabase Storage and the VPS upload endpoint as the sole media backend.
- **Cloudflare Pages** replaces Hostinger for the React SPA — automatic global distribution, no config needed for scaling.
- **Cloudflare Worker** (`media-worker`) handles authenticated uploads (generates presigned R2 upload URLs) and serves as the edge cache policy layer.
- **`storage_backend = 'r2'`** added to the existing toggle in `site_settings`; `storage.ts` is extended, not rewritten.

---

### 6.2 Infrastructure Setup

- [ ] Create R2 bucket `top87-media` with public access enabled via custom domain `media.top87.id`
- [ ] Point `media.top87.id` DNS to R2 bucket via Cloudflare (CNAME to R2 public endpoint)
- [ ] Configure Cache-Control defaults on R2 objects: `public, max-age=31536000, immutable` for media files; `no-cache` for CMS images that may be replaced
- [ ] Create Cloudflare Worker `top87-media-worker`:
  - `POST /upload` — validates Supabase JWT, generates R2 presigned upload URL, returns it to client
  - `GET /resize/:path?w=&h=&q=` — proxies R2 object through Cloudflare Images transform (on-the-fly resize for gallery thumbnails and directory avatars)
  - Add Worker route: `media.top87.id/*`
- [ ] Enable Cloudflare WAF rate-limiting rule: max 200 req/10s per IP on `/upload`
- [ ] Set up Cloudflare Pages project pointing to the `dist/` output of this repo; configure build command `npm run build` and environment variables from `.env.local`

---

### 6.3 Storage Layer Changes (`src/lib/storage.ts`)

Current backends: `'supabase'` | `'vps'`
New backend added: `'r2'`

- [ ] Add `uploadToR2(file, path)` — calls `media.top87.id/upload` (Worker endpoint) to get a presigned URL, then PUTs the file directly from the browser to R2. Returns the full `https://media.top87.id/{path}` URL.
- [ ] Update `resolveMediaUrl(storagePath)` — R2 URLs are already full `https://` URLs; existing passthrough logic handles them without change. No breaking changes.
- [ ] Update `uploadFile(file, path)` dispatcher — add `case 'r2': return uploadToR2(file, path)`
- [ ] Add `getResizedUrl(url, width, height)` utility — rewrites R2 URLs through the Worker resize endpoint for use in thumbnails; no-ops for non-R2 URLs

---

### 6.4 site_settings Changes

| Key | Value | Notes |
|---|---|---|
| `storage_backend` | `'r2'` | Flipped from `'vps'` or `'supabase'` |
| `r2_worker_url` | `https://media.top87.id` | Worker base URL (configurable in case domain changes) |
| `cdn_resize_enabled` | `true` / `false` | Toggle Cloudflare Image resizing |

- [ ] `SiteAdmin.tsx` — add R2 section: Worker URL field, CDN resize toggle, current backend indicator with a live upload test button (uploads a 1px test file and confirms the URL resolves)

---

### 6.5 Media Migration Script

All existing media rows in the `media` table have `storage_path` values pointing to either Supabase Storage or the VPS. Since this is pre-launch with test data only, migration is a one-time bulk copy rather than a live migration.

- [ ] Node.js script `scripts/migrate-to-r2.js`:
  1. Query all `media` rows from Supabase
  2. For each row: download the file from its current backend (`resolveMediaUrl`), upload to R2 at the same path, update `media.storage_path` to the new `https://media.top87.id/...` URL
  3. Log successes and failures; produce a summary CSV
  4. Dry-run mode (`--dry-run`) that lists what would be moved without touching anything
- [ ] CMS images (`cms_content` rows where `content_type = 'image_url'`) — same script covers them via a second pass over `cms_content`
- [ ] After migration: verify 10 random media items load correctly, then flip `storage_backend` to `'r2'` in `site_settings`

> **Note:** Since all current data is test data, this script can be run destructively (no rollback needed). For production, run in dry-run first.

---

### 6.6 Frontend / Admin Tasks

- [ ] `Gallery.tsx` — use `getResizedUrl(url, 400, 300)` for thumbnails; full URL for expanded view
- [ ] `MemberProfile.tsx` + `Directory.tsx` — use `getResizedUrl(url, 128, 128)` for avatars
- [ ] `AdminMedia.tsx` — upload path updated automatically via `storage.ts` dispatcher; no UI change needed
- [ ] `SubmitMedia.tsx` — same; upload path update is transparent
- [ ] `SiteAdmin.tsx` — R2 config section (see 6.4)
- [ ] `App.tsx` / deploy config — add Cloudflare Pages deployment target to README (build command, env vars)

---

### 6.7 Spike Traffic Strategy

Cloudflare's network handles the traffic amplification layer. No application code changes are needed for scaling beyond what's listed — this is configuration only.

| Concern | Solution |
|---|---|
| React SPA traffic spike | Cloudflare Pages serves static files from 300+ PoPs; scales to any load automatically |
| Media CDN cache miss storm | R2 + Cloudflare CDN; cache hit ratio approaches 100% after first request per edge node |
| Gallery page hammering DB | Existing TanStack Query `staleTime` caching; add `staleTime: 5 * 60_000` to `qk.media` queries for approved members |
| Upload burst (event day) | Worker rate limiting (6.2) + Supabase connection pool (already active) |
| DDoS / bot traffic | Cloudflare's automatic DDoS mitigation (free tier); no additional config |
| Supabase query pressure | Supabase's built-in PgBouncer handles connection pooling; no changes needed |

---

### 6.8 Cost Model Post-Migration

| Resource | Before | After |
|---|---|---|
| Media storage | Hostinger plan limit + Supabase 1 GB free | R2: $0.015/GB/month, effectively free at launch scale |
| Media egress | Hostinger bandwidth cap | R2: **$0 egress** (Cloudflare network) |
| CDN | None | Cloudflare free tier: unlimited CDN bandwidth |
| SPA hosting | Hostinger shared plan | Cloudflare Pages free tier: unlimited requests |
| Image resizing | None | Cloudflare Images: $5/100k transformations (or use free `cf-resize` Worker approach) |

---

### 6.9 Exit Criteria

- All media uploaded after go-live lands in R2 and is served from `media.top87.id`
- Migration script has run; all pre-existing test media accessible via new R2 URLs
- Gallery thumbnails and member avatars load via Worker resize endpoint
- `SiteAdmin.tsx` R2 config section live; test upload button confirms Worker is reachable
- Cloudflare Pages deployment live; Hostinger retained only as a fallback/DNS holder
- No egress charges on R2 after 30 days of operation (verify in Cloudflare dashboard)
- Rate limiting rule confirmed blocking burst uploads in a load test

---

## Dashboard Widget Activation Summary

| Widget | Ph 0 | Ph 1 | Ph 2 | Ph 3 | Ph 4 | Now |
|---|---|---|---|---|---|---|
| Kehadiran Alumni (count only) | ✅ | ✅ +breakdown | ✅ | ✅ | ✅ | ✅ |
| Total Dana Terkumpul | ⬜ empty | ⬜ empty | ✅ live | ✅ | ✅ | ✅ |
| Progress Reuni (Dana + Merch) | ⬜ | ⬜ | ⬜ | ⬜ | ✅ live | ✅ |
| Merchandise Terpesan | ⬜ empty | ⬜ empty | ⬜ empty | ✅ live | ✅ | ✅ |
| Pendaftaran payment badges | ⬜ hidden | ⬜ hidden | ✅ live | ✅ | ✅ | ✅ |
| Bantu Teman Angkatan | ⬜ hidden | ⬜ hidden | ✅ revealed | ✅ | ✅ | ✅ |
| Galeri Nostalgia comment | ⬜ thumbs only | ⬜ thumbs only | ⬜ thumbs only | ⬜ thumbs only | ✅ live | ✅ |
| Countdown timer | ✅ CMS | ✅ | ✅ | ✅ | ✅ | ✅ |
| Budget table | ✅ CMS | ✅ | ✅ | ✅ | ✅ | ✅ |
| Donasi sidebar link | ⬜ hidden | ⬜ hidden | ✅ flag | ✅ | ✅ | ✅ |
| Merchandise sidebar link | ⬜ hidden | ⬜ hidden | ⬜ hidden | ✅ flag | ✅ | ✅ |

---

## Phase 7 — Theme Toggle, Finance Admin Role & Charter Management
**Goal:** Three independent admin/UX improvements that are each self-contained but share the same phase because none is large enough to warrant its own phase and all depend on the core system being stable (Phase 3+).

---

### 7.1 Light / Dark Theme Toggle

**Context:** Phase 1 listed a theme toggle in its task list but it was deferred. This is the proper phase to deliver it.

#### How it works
- A `ThemeContext` wraps the app and stores the user's preference in `localStorage`.
- The root `<html>` element gets a `class="dark"` or `class="light"` attribute.
- Tailwind's `dark:` variant applies dark-mode overrides throughout.
- Toggle button (sun/moon icon) lives at the bottom of the member sidebar and in the AdminLayout sidebar footer.

#### Tasks
- [ ] `src/contexts/ThemeContext.tsx` — `ThemeProvider` + `useTheme()` hook; reads/writes `localStorage('theme')`; defaults to system preference (`prefers-color-scheme`)
- [ ] `App.tsx` — wrap with `<ThemeProvider>`
- [ ] `index.css` — define CSS variables for both themes under `:root` (light) and `.dark` (dark):
  - `--color-bg`, `--color-surface`, `--color-text`, `--color-border` etc.
  - Light: parchment cream palette; Dark: existing charcoal/navy palette
- [ ] `MainLayout.tsx` — add sun/moon toggle button to sidebar footer
- [ ] `AdminLayout.tsx` — add sun/moon toggle button to sidebar footer
- [ ] All pages/components — audit and add `dark:` Tailwind variants to cards, text, borders, backgrounds
- [ ] `ThemeContext` — expose `isDark` boolean for conditional class logic where `dark:` variant is not enough

#### Exit Criteria
- Toggling theme instantly switches all pages between light and dark
- Preference survives page refresh
- Defaults to the OS/browser preference on first visit

---

### 7.2 Finance Admin Role

**Context:** Bank reconciliation (marking payments `bank_reconciled`) is a distinct responsibility — typically done by the treasurer. They should not have access to member management, media, or merchandise. This is a new minimal-privilege role.

#### What Finance Admin can do
| Action | Allowed |
|---|---|
| View all confirmed payments (iuran + donasi) | ✅ |
| Change status `confirmed` → `bank_reconciled` | ✅ |
| Add admin notes to a payment | ✅ |
| View Financial Report (read-only) | ✅ |
| View member list, media, orders, site settings | ❌ |
| Approve/reject new members | ❌ |
| Edit merchandise catalog | ❌ |

Finance admins see a **stripped-down admin panel** with only two nav items: **Bank Rekon** and **Lap. Keuangan**.

#### Database Changes
```sql
-- New table — mirrors charter_admins structure
CREATE TABLE finance_admins (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: finance admins can only update the status column on confirmed payments
CREATE POLICY "payments_finance_admin_update"
  ON payments FOR UPDATE
  USING (
    status = 'confirmed'
    AND EXISTS (SELECT 1 FROM finance_admins WHERE profile_id = auth.uid())
  )
  WITH CHECK (status = 'bank_reconciled');

-- Finance admins can read all payments (to see what needs reconciling)
CREATE POLICY "payments_finance_admin_select"
  ON payments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM finance_admins WHERE profile_id = auth.uid())
  );
```

#### Frontend Tasks
- [ ] `src/hooks/useAdminStatus.ts` — extend to detect `isFinanceAdmin` (has row in `finance_admins`); expose alongside `isAdmin` and `isSuperAdmin`
- [ ] `AdminLayout.tsx` — when `isFinanceAdmin` and not `isAdmin`/`isSuperAdmin`, show a restricted nav:
  - **Bank Rekon** (`/admin/bank-rekon`) — payments queue showing only `confirmed` status
  - **Lap. Keuangan** (`/admin/financial`) — read-only financial report
- [ ] `src/pages/admin/AdminBankRekon.tsx` — new page (super-set of AdminPayments but pre-filtered to `confirmed` only):
  - List of confirmed payments needing reconciliation
  - One-click "Rekonsiliasi" button per row → sets status to `bank_reconciled`
  - Optional admin notes field
  - No access to other status transitions
- [ ] `AdminRoles.tsx` — add Finance Admin section: search member by name, grant/revoke Finance Admin role; shown only to super admin
- [ ] `App.tsx` — register `/admin/bank-rekon` route
- [ ] RLS migration — add policies above to a new migration file
- [ ] Update user manual (`panduan-super-admin.md`) — document Finance Admin role and how to assign it

#### Exit Criteria
- Finance admin can log in, see only Bank Rekon + Lap. Keuangan in their nav
- Finance admin can mark `confirmed` payments as `bank_reconciled`
- Finance admin cannot reach any other admin page (redirected away)
- Super admin can assign/revoke Finance Admin role from AdminRoles page

---

### 7.3 Charter Management UI

**Context:** Currently only 4 charters exist and they were seeded directly in the database. Super admins need a UI to create new charters, edit existing ones, and assign members to charters — without touching Supabase directly.

#### What needs managing
- Charter CRUD (create, rename, change city/country, deactivate)
- Assign a member to a charter (add a `charter_members` row)
- Remove a member from a charter
- Set a member's primary charter (`is_primary = true`)
- Assign a charter admin to a charter (this already exists in AdminRoles but should be consolidated here)

#### Database Changes
No new tables needed. The existing `charters` and `charter_members` tables cover everything. Two small additions:

```sql
-- Allow super admin to deactivate a charter without deleting it
ALTER TABLE charters ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- RLS: super admin full CRUD on charters
CREATE POLICY "charters_superadmin_all"
  ON charters FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

-- RLS: super admin full CRUD on charter_members
CREATE POLICY "charter_members_superadmin_all"
  ON charter_members FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true)
  );
```

#### Frontend Tasks
- [ ] `src/pages/admin/AdminCharters.tsx` — new super-admin-only page at `/admin/charters`:
  - **Charter list** — name, city, country, member count, active/inactive toggle; Edit button per row
  - **Create Charter** form — name, slug (auto-generated from name, editable), city, country
  - **Edit Charter** drawer — all fields + deactivate toggle
  - **Charter detail** — member list for that charter; search + add member (autocomplete from approved profiles); remove member; set primary toggle
  - Charter admin assignments shown inline (links to AdminRoles for changes)
- [ ] `AdminLayout.tsx` — add **Charters** link to Super Admin nav section
- [ ] `App.tsx` — register `/admin/charters` route
- [ ] `src/lib/queries.ts` — add:
  - `createCharter(data)` — insert into `charters`
  - `updateCharter(id, data)` — update charter fields
  - `addMemberToCharter(profileId, charterId, isPrimary)` — insert `charter_members` row
  - `removeMemberFromCharter(profileId, charterId)` — delete row
  - `setPrimaryCharter(profileId, charterId)` — update `is_primary`; unsets previous primary
  - `qk.adminCharters()` — cache key
- [ ] RLS migration — add policies above
- [ ] Update user manual (`panduan-super-admin.md`) — add Charter Management section

#### Exit Criteria
- Super admin can create a new charter from the UI (no direct DB access needed)
- Super admin can add/remove members from any charter
- Super admin can rename or deactivate a charter
- Charter count in the system is no longer limited to the 4 seeded rows
- New charters appear immediately in the public Charters page and all dropdowns

---

### 7.4 Admin Panel Backdrop / Background Image

**Context:** The admin panel main content area currently shows the flat parchment background inherited from the member-facing side. Super admins should be able to set a custom background image (or revert to the default solid colour) from Site Settings — without touching code.

#### How it works
- A new `site_settings` key `admin_backdrop_url` stores the URL of the background image (empty string = use default solid colour).
- `AdminLayout.tsx` reads this value and applies it as a CSS background on the main content `<div>`.
- The image is rendered with `bg-cover bg-center bg-fixed` and a dark overlay so content remains legible regardless of the image chosen.
- Toggling back to the default removes the image entirely and returns to the solid charcoal background.

#### site_settings Changes
| Key | Default value | Notes |
|---|---|---|
| `admin_backdrop_url` | `''` | Full URL to background image; empty = solid default |
| `admin_backdrop_opacity` | `'15'` | Integer 0–100; controls the overlay darkness so text stays readable |

#### Tasks
- [ ] `supabase/migrations` — insert `admin_backdrop_url` and `admin_backdrop_opacity` keys into `site_settings` with empty/default values
- [ ] `src/lib/queries.ts` — add `fetchAdminBackdrop()` fetcher; add `qk.adminBackdrop()` cache key
- [ ] `AdminLayout.tsx` — call `useQuery(qk.adminBackdrop(), fetchAdminBackdrop)` and apply result to the main content wrapper:
  - If URL is set: `style={{ backgroundImage: \`url(${url})\` }}` + Tailwind `bg-cover bg-center bg-fixed` + a `::before` overlay div at the configured opacity
  - If URL is empty: no inline style (solid `bg-charcoal` default)
- [ ] `SiteAdmin.tsx` — add **Admin Backdrop** section:
  - Image URL input field (or file upload that goes through the existing `storage.ts` uploader)
  - Preview thumbnail of current backdrop
  - Opacity slider (0–100) with live preview
  - **Reset to default** button (clears URL, sets opacity back to 15)
- [ ] Update user manual (`panduan-super-admin.md`) — add Admin Backdrop sub-section under Site Settings

#### Exit Criteria
- Super admin can set a background image for the admin panel from Site Settings
- Overlay opacity is adjustable so content remains readable over any image
- Resetting to default returns to the solid charcoal background instantly
- Change takes effect for all admin users on next page load (no deploy needed)

---

### 7.5 Phase 7 Exit Criteria (all four features)

- Light/dark theme toggle live in both member and admin layouts; preference persists
- Finance Admin role assignable from AdminRoles; holders see only Bank Rekon + Lap. Keuangan
- Super admin can fully manage charters and memberships without touching the database directly
- Super admin can set and adjust the admin panel backdrop from Site Settings
- All four features covered in the user manual

---

## Phase Summary Table

| Phase | Status | Features | New Tables | Effort | Depends On |
|---|---|---|---|---|---|
| **0** | ✅ Complete | Design system, CMS foundation + admin UI, shell redesign, empty states, Anggaran + FAQ pages, phase-gated nav | `cms_content` | Medium–High | Committee approval ✅ |
| **1** | ✅ Complete | Extended profile, friends list, attendance tracking | `profile_friends` + profile columns | Low | Phase 0 |
| **2** | ✅ Complete | QRIS payments, receipts, admin reconciliation | `payments` | Medium | Phase 1 |
| **3** | ✅ Complete | Merchandise catalog, orders, stock tracking, cost/margin | `merchandise`, `merchandise_orders` | Medium | Phase 2 |
| **4** | ✅ Complete | Gallery comments + lightbox navigation, countdown widgets, attendance label fix | `media_comments` | Low–Medium | Phase 2 + 3 |
| **4b** | ✅ Complete | Admin Financial Report (unified view, multi-filter), Help Modal (role-aware in-app user manual) | — | Low–Medium | Phase 3 |
| **5** | ⬜ Pending | WhatsApp daily status bot | — (site_settings keys) | High (separate service) | Phase 4 |
| **6** | ⬜ Pending | Cloudflare R2 storage, CDN, image resizing, Cloudflare Pages deploy, spike-traffic hardening | — (site_settings keys) | Medium (infra-heavy) | Phase 5 |
| **7** | ⬜ Pending | Light/dark theme toggle, Finance Admin role (bank rekon only), Charter management UI, Admin panel backdrop image | `finance_admins` | Medium | Phase 3 |
