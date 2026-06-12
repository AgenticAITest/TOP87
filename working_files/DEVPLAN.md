# TOP87 Website — Dev Plan

## Site Map

```
PUBLIC (no login)
├── / ..................... Landing page
├── /about ................. Story of Class of '87
└── /charters .............. Charter overview grid

AUTH FLOW
├── /register .............. Complete profile after Google login
└── /pending ............... "Awaiting approval" holding page

MEMBER (approved only)
├── /directory ............. Alumni directory, search/filter
├── /charters/:slug ........ Individual charter page
├── /members/:id ........... Public member profile
├── /profile ............... My profile (edit)
├── /gallery ............... Photo + video gallery
└── /submit ................ Submit photos/videos

CHARTER ADMIN
├── /admin ................. Dashboard (their charter only)
├── /admin/members ......... Approve / suspend / delete members
├── /admin/media ........... Approve submitted media
└── /admin/cms ............. Edit their charter's page content

SUPER ADMIN
├── /admin/site ............ Site-wide CMS (homepage, about, global text)
├── /admin/charters ........ Manage charters (create, assign admins)
└── /admin/all-members ..... View/manage all members across charters
```

---

## Page Content

| Page | Content |
|------|---------|
| **Landing** | Hero ("A Legacy Reunited"), charter spotlight teaser (4 cards), member count stats, latest gallery preview, CTA to register |
| **About** | School history, Class of '87 story, founding of the network, timeline, committee/founders section |
| **Charters** | Grid of all chapters with name, city/country, member count, charter admin contact, link to charter page |
| **Charter page** | Hero image, about this chapter, local events/news (CMS-managed), charter members grid, gallery |
| **Directory** | Search by name/charter/location, filter by status, member cards with name + chapter + role |
| **Member profile** | Photo, name, charter, bio, current city, profession, submitted gallery |
| **Gallery** | Filter by charter/year/type (photo/video), masonry grid, lightbox, submission attribution |
| **Submit media** | Upload form, charter tag, caption, year taken — goes into approval queue |

---

## Database Schema

```sql
-- Core identity
profiles          id, user_id (→ auth.users), name, phone, bio,
                  avatar_url, city, profession, status
                  (pending|approved|suspended|rejected), created_at

charters          id, slug, name, city, country, description,
                  cover_image_url, founded_year

charter_members   profile_id, charter_id, is_primary (bool)
                  -- a member can belong to multiple charters

charter_admins    profile_id, charter_id, granted_by, granted_at
                  -- multiple admins per charter

-- Media
media             id, profile_id, charter_id, type (photo|video),
                  storage_path, caption, year_taken,
                  status (pending|approved|rejected), reviewed_by

-- CMS
cms_blocks        id, page (homepage|about|charter), charter_id (null = global),
                  block_key (hero_title|hero_image|section_body|...),
                  content_type (text|image|richtext),
                  value, updated_by, updated_at

-- Audit
audit_log         id, action, performed_by, target_id, target_type,
                  reason, created_at
```

---

## Access Control (RLS)

| Role | How assigned | What they can do |
|------|-------------|-----------------|
| **Public** | Unauthenticated | Landing, About, Charters overview only |
| **Pending** | Just registered | Only sees /pending page |
| **Member** | Approved by charter admin | Directory, gallery, charter pages, submit media, edit own profile |
| **Charter Admin** | Granted by super admin | + Approve/reject members in their charter, approve media, edit their charter's CMS |
| **Super Admin** | DB flag on profiles | Everything — site-wide CMS, create charters, assign admins, manage all members |

---

## Registration Flow

```
1. Click "Sign in with Google" → Supabase Google OAuth
2. New user → redirect to /register
   - Fill: full name, phone, city, profession, bio, avatar upload
   - Select primary charter (required) + secondary charters (optional)
3. Profile created with status = 'pending'
4. Charter admin(s) see new request in /admin/members queue
5. Admin approves → status = 'approved', member gets access
   Admin rejects → status = 'rejected', user sees message on /pending
6. Returning approved user → straight to /directory
```

---

## Member Suspension & Deletion

- **Suspend:** `status = 'suspended'` — blocks member from member-only pages, still exists in DB, can be reinstated. Charter admin can suspend their own charter's members; super admin can suspend anyone.
- **Delete:** Soft-delete via `deleted_at` timestamp — removes from directory but preserves media attribution. Super admin only.
- Both actions require a **reason field**, logged in `audit_log`.

---

## Media Submission & Approval

```
Member submits → upload to Supabase Storage → media row status='pending'
Charter admin reviews queue → approve or reject (with optional note)
Approved → appears in gallery
Rejected → member sees reason
```

- **Storage:** Supabase Storage bucket `media`, path structure `/charter-slug/year/filename`
- **Video:** file upload or YouTube/Vimeo URL (to control storage costs)
- **Images:** client-side resize before upload (max 2MB per image)

---

## CMS Architecture

Lightweight block-based CMS stored in the `cms_blocks` table. Each editable region has a `block_key`.

| page | block_key | What it controls |
|------|-----------|-----------------|
| `homepage` | `hero_title` | Main headline |
| `homepage` | `hero_subtitle` | Tagline below headline |
| `homepage` | `hero_image` | Hero background image |
| `about` | `body` | Rich text body of About page |
| `charter` | `hero_image` | Per-charter cover image |
| `charter` | `about_text` | Per-charter description |
| `charter` | `news_block` | Latest news/events for that charter |

Admin UI: click a block → edit text or upload image → save. No page reload.

---

## Phased Build Order

| Phase | Scope | Notes |
|-------|-------|-------|
| **0 — Routing** | Add React Router, convert anchor nav to real routes | Required before all other phases |
| **1 — Auth + Schema** | Google OAuth, register flow, /pending page, DB tables + RLS policies | Foundation |
| **2 — Member features** | Directory, profiles, charter pages pulling live data from Supabase | Replaces hardcoded arrays |
| **3 — Admin dashboard** | Member approval queue, suspend/delete, charter admin RBAC | Medium-High complexity |
| **4 — Media** | Upload UI, Supabase Storage, gallery page, admin approval queue | Medium |
| **5 — CMS** | cms_blocks table, inline admin edit UI, live content rendering | Medium-High |
| **6 — Super admin** | Site-wide controls, charter management, audit log viewer | Final layer |
