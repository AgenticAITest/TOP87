import { supabase } from './supabase';

// ─── Query key factory ────────────────────────────────────────────────────────
// All keys live here so invalidations are consistent across the app.
export const qk = {
  charters:       ()                                      => ['charters']                                  as const,
  charter:        (slug: string)                          => ['charters', slug]                            as const,
  members:        ()                                      => ['members']                                   as const,
  member:         (id: string)                            => ['members', id]                               as const,
  memberships:    (profileId: string)                     => ['memberships', profileId]                    as const,
  media:          (status: string)                        => ['media', status]                             as const,
  adminDashboard: (isSuperAdmin: boolean, ids: string[]) => ['admin', 'dashboard', isSuperAdmin, ...ids]  as const,
  adminMembers:   (isSuperAdmin: boolean, ids: string[]) => ['admin', 'members',   isSuperAdmin, ...ids]  as const,
  adminMedia:     (status: string, isSuperAdmin: boolean, ids: string[]) =>
                                                            ['admin', 'media', status, isSuperAdmin, ...ids] as const,
  // Phase 0 — CMS, feature flags, member dashboard
  cms:          (pageKey: string)                         => ['cms', pageKey]                              as const,
  featureFlags: ()                                        => ['site_settings', 'feature_flags']            as const,
  dashboard:    ()                                        => ['dashboard', 'member']                       as const,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function must<T>(data: T | null, error: unknown): T {
  if (error) throw error;
  return data as T;
}

async function charterScope(isSuperAdmin: boolean, charterIds: string[]) {
  if (isSuperAdmin || charterIds.length === 0) return null;
  const { data } = await supabase
    .from('charter_members').select('profile_id').in('charter_id', charterIds);
  return (data ?? []).map((r: any) => r.profile_id as string);
}

// ─── Public / member fetchers ─────────────────────────────────────────────────

export async function fetchCharters() {
  const [{ data: charterData, error }, { data: memberData }] = await Promise.all([
    supabase.from('charters').select('id, slug, name, city, country, description').order('name'),
    supabase.from('charter_members').select('charter_id'),
  ]);
  must(charterData, error);

  const counts: Record<string, number> = {};
  (memberData ?? []).forEach((cm: any) => {
    counts[cm.charter_id] = (counts[cm.charter_id] ?? 0) + 1;
  });
  return (charterData ?? []).map((c: any) => ({ ...c, memberCount: counts[c.id] ?? 0 }));
}

export async function fetchCharterBySlug(slug: string) {
  const { data: charter, error } = await supabase
    .from('charters')
    .select('id, slug, name, city, country, description, hero_image_url, announcement')
    .eq('slug', slug)
    .single();
  must(charter, error);

  const { data: links } = await supabase
    .from('charter_members')
    .select('profile_id, is_primary')
    .eq('charter_id', charter!.id);

  const profileIds = (links ?? []).map((l: any) => l.profile_id as string);
  if (profileIds.length === 0) return { charter: charter!, members: [] };

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, city, profession')
    .eq('status', 'approved')
    .in('id', profileIds)
    .order('name');

  const primaryMap = Object.fromEntries((links ?? []).map((l: any) => [l.profile_id, l.is_primary]));
  return {
    charter: charter!,
    members: (profiles ?? []).map((p: any) => ({ ...p, is_primary: primaryMap[p.id] ?? false })),
  };
}

export async function fetchApprovedMembers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, city, profession, charter_members(charter_id, is_primary, charters(id, name))')
    .eq('status', 'approved')
    .order('name');
  must(data, error);
  return (data ?? []).map((p: any) => {
    const primary = (p.charter_members ?? []).find((cm: any) => cm.is_primary);
    return { id: p.id, name: p.name, avatar_url: p.avatar_url,
             city: p.city, profession: p.profession, primaryCharter: primary?.charters ?? null };
  });
}

export async function fetchMemberById(id: string) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, city, profession, bio')
    .eq('id', id).eq('status', 'approved').single();
  must(profile, error);

  const { data: cms } = await supabase
    .from('charter_members')
    .select('charter_id, is_primary, charters(name, slug)')
    .eq('profile_id', id);

  return {
    profile: profile!,
    memberships: (cms ?? []).map((cm: any) => ({
      charter_id: cm.charter_id, is_primary: cm.is_primary, charter: cm.charters,
    })),
  };
}

export async function fetchCharterById(id: string) {
  const { data, error } = await supabase
    .from('charters')
    .select('id, slug, name, city, country, description, hero_image_url, announcement')
    .eq('id', id)
    .single();
  must(data, error);
  return data as {
    id: string; slug: string; name: string; city: string; country: string;
    description: string | null; hero_image_url: string | null; announcement: string | null;
  };
}

export async function updateCharterContent(
  id: string,
  patch: { description?: string | null; hero_image_url?: string | null; announcement?: string | null }
) {
  const { error } = await supabase.from('charters').update(patch).eq('id', id);
  if (error) throw error;
}

export async function fetchMemberships(profileId: string) {
  const { data, error } = await supabase
    .from('charter_members')
    .select('charter_id, is_primary, charters(name, slug)')
    .eq('profile_id', profileId);
  must(data, error);
  return (data ?? []).map((cm: any) => ({
    charter_id: cm.charter_id, is_primary: cm.is_primary, charter: cm.charters,
  }));
}

export async function fetchApprovedMedia() {
  const { data, error } = await supabase
    .from('media')
    .select('id, type, storage_path, external_url, caption, year_taken, created_at, charters(id, name), profiles!media_profile_id_fkey(id, name)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });
  must(data, error);
  return (data ?? []).map((m: any) => ({
    id: m.id, type: m.type as 'photo' | 'video',
    storage_path: m.storage_path as string | null,
    external_url: m.external_url as string | null,
    caption: m.caption as string | null,
    year_taken: m.year_taken as number | null,
    created_at: m.created_at as string,
    charter: m.charters as { id: string; name: string } | null,
    profile: m.profiles as { id: string; name: string } | null,
  }));
}

// ─── Admin fetchers ───────────────────────────────────────────────────────────

export async function fetchAdminDashboard(isSuperAdmin: boolean, charterIds: string[]) {
  const profileIds = await charterScope(isSuperAdmin, charterIds);

  const statsQ = supabase.from('profiles').select('status');
  const { data: statusData } = profileIds ? await statsQ.in('id', profileIds) : await statsQ;
  const stats = { pending: 0, approved: 0, suspended: 0, total: 0 };
  (statusData ?? []).forEach((p: any) => {
    stats.total++;
    if (p.status === 'pending')   stats.pending++;
    if (p.status === 'approved')  stats.approved++;
    if (p.status === 'suspended') stats.suspended++;
  });

  const pendingQ = supabase
    .from('profiles')
    .select('id, name, avatar_url, city, created_at, charter_members(is_primary, charters(name))')
    .eq('status', 'pending').order('created_at', { ascending: true }).limit(6);
  const { data: pendingData } = profileIds ? await pendingQ.in('id', profileIds) : await pendingQ;
  const pending = (pendingData ?? []).map((p: any) => {
    const primary = (p.charter_members ?? []).find((cm: any) => cm.is_primary);
    return { id: p.id, name: p.name, avatar_url: p.avatar_url,
             city: p.city, created_at: p.created_at,
             primaryCharter: primary?.charters?.name ?? null };
  });

  const { data: audit } = await supabase
    .from('audit_log')
    .select('id, action, created_at, target_id, details')
    .order('created_at', { ascending: false }).limit(8);

  return { stats, pending, audit: audit ?? [] };
}

export async function fetchAdminMembers(isSuperAdmin: boolean, charterIds: string[]) {
  const profileIds = await charterScope(isSuperAdmin, charterIds);
  const q = supabase
    .from('profiles')
    .select('id, name, avatar_url, city, profession, status, created_at, charter_members(is_primary, charters(name))')
    .order('created_at', { ascending: false });
  const { data, error } = profileIds ? await q.in('id', profileIds) : await q;
  must(data, error);
  return (data ?? []).map((p: any) => {
    const primary = (p.charter_members ?? []).find((cm: any) => cm.is_primary);
    return { id: p.id, name: p.name, avatar_url: p.avatar_url,
             city: p.city, profession: p.profession, status: p.status as string,
             created_at: p.created_at as string,
             primaryCharter: primary?.charters?.name ?? null };
  });
}

export async function fetchAdminMedia(status: string, isSuperAdmin: boolean, charterIds: string[]) {
  let q = supabase
    .from('media')
    .select('id, type, storage_path, external_url, caption, year_taken, status, created_at, charters(id, name), profiles!media_profile_id_fkey(id, name)')
    .eq('status', status)
    .order('created_at', { ascending: status === 'pending' });
  if (!isSuperAdmin && charterIds.length > 0) q = q.in('charter_id', charterIds);
  const { data, error } = await q;
  must(data, error);
  return (data ?? []).map((m: any) => ({
    id: m.id, type: m.type as 'photo' | 'video',
    storage_path: m.storage_path as string | null,
    external_url: m.external_url as string | null,
    caption: m.caption as string | null,
    year_taken: m.year_taken as number | null,
    status: m.status as string,
    created_at: m.created_at as string,
    charter: m.charters as { id: string; name: string } | null,
    profile: m.profiles as { id: string; name: string } | null,
  }));
}

// ─── Featured Members ─────────────────────────────────────────────────────────

export type FeaturedMode = 'manual' | 'random';
export interface FeaturedConfig { mode: FeaturedMode; memberIds: string[]; interval: number; }

export async function getFeaturedConfig(): Promise<FeaturedConfig> {
  const { data } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['featured_members_mode', 'featured_members_ids', 'featured_members_interval']);
  const map = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
  return {
    mode:      (map['featured_members_mode'] ?? 'random') as FeaturedMode,
    memberIds: map['featured_members_ids'] ? JSON.parse(map['featured_members_ids']) : [],
    interval:  map['featured_members_interval'] ? parseInt(map['featured_members_interval']) : 15,
  };
}

export async function setFeaturedConfig(cfg: FeaturedConfig): Promise<void> {
  const { error } = await supabase.from('site_settings').upsert([
    { key: 'featured_members_mode',     value: cfg.mode },
    { key: 'featured_members_ids',      value: JSON.stringify(cfg.memberIds) },
    { key: 'featured_members_interval', value: String(cfg.interval) },
  ], { onConflict: 'key' });
  if (error) throw error;
}

// ─── Site Content (About + Yearbook) ─────────────────────────────────────────

export interface AboutContent  { heroUrl: string; body: string; }
export interface YearbookEntry { type: 'pdf' | 'video'; url: string; }
export interface YearbookContent { y1987: YearbookEntry; y2026: YearbookEntry; }

const CONTENT_KEYS = [
  'about_hero_url', 'about_body',
  'yearbook_1987_type', 'yearbook_1987_url',
  'yearbook_2026_type', 'yearbook_2026_url',
];

export async function getContentConfig(): Promise<{ about: AboutContent; yearbook: YearbookContent }> {
  const { data } = await supabase.from('site_settings').select('key, value').in('key', CONTENT_KEYS);
  const m = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
  return {
    about: { heroUrl: m['about_hero_url'] ?? '', body: m['about_body'] ?? '' },
    yearbook: {
      y1987: { type: (m['yearbook_1987_type'] ?? 'pdf') as 'pdf' | 'video', url: m['yearbook_1987_url'] ?? '' },
      y2026: { type: (m['yearbook_2026_type'] ?? 'pdf') as 'pdf' | 'video', url: m['yearbook_2026_url'] ?? '' },
    },
  };
}

export async function setAboutContent(about: AboutContent): Promise<void> {
  const { error } = await supabase.from('site_settings').upsert([
    { key: 'about_hero_url', value: about.heroUrl },
    { key: 'about_body',     value: about.body },
  ], { onConflict: 'key' });
  if (error) throw error;
}

export async function setYearbookContent(yearbook: YearbookContent): Promise<void> {
  const { error } = await supabase.from('site_settings').upsert([
    { key: 'yearbook_1987_type', value: yearbook.y1987.type },
    { key: 'yearbook_1987_url',  value: yearbook.y1987.url  },
    { key: 'yearbook_2026_type', value: yearbook.y2026.type },
    { key: 'yearbook_2026_url',  value: yearbook.y2026.url  },
  ], { onConflict: 'key' });
  if (error) throw error;
}
