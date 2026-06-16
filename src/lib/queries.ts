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
  // Phase 1 — friends
  friends:      (profileId: string)                       => ['friends', profileId]                        as const,
  // Phase 2 — payments
  payments:      (profileId: string)                      => ['payments', profileId]                       as const,
  adminPayments: (isSuperAdmin: boolean, ids: string[])   => ['admin', 'payments', isSuperAdmin, ...ids]   as const,
  qrisConfig:    ()                                        => ['site_settings', 'qris']                     as const,
  // Phase 3 — merchandise
  merchandise:      ()                                      => ['merchandise']                                as const,
  adminMerchandise: ()                                      => ['admin', 'merchandise']                       as const,
  orders:           (profileId: string)                    => ['orders', profileId]                          as const,
  adminOrders:      (isSuperAdmin: boolean, ids: string[]) => ['admin', 'orders', isSuperAdmin, ...ids]      as const,
  // Financial report
  financialReport:  ()                                      => ['admin', 'financial-report']                  as const,
  // Phase 4 — comments
  comments:         (mediaId: string)                       => ['comments', mediaId]                          as const,
  latestComment:    ()                                      => ['comments', 'latest']                         as const,
  // Generic site setting
  siteSetting:      (key: string)                           => ['site_settings', key]                         as const,
  // Finance admin
  financeAdmins:    ()                                      => ['admin', 'finance-admins']                    as const,
  confirmedPayments:()                                      => ['admin', 'payments', 'confirmed']             as const,
  // Phase 7.3 — charter management
  adminCharters:    ()                                      => ['admin', 'charters']                          as const,
  charterMembers:   (charterId: string)                     => ['admin', 'charters', charterId, 'members']   as const,
  // Phase 7.4 — admin backdrop
  adminBackdrop:    ()                                      => ['admin', 'backdrop']                          as const,
  // Keringanan (financial assistance)
  myKeringanan:     (profileId: string)                     => ['keringanan', 'my', profileId]                as const,
  allKeringanan:    ()                                      => ['keringanan', 'all']                          as const,
  // Payment summary report
  paymentSummary:   (isSuperAdmin: boolean, ids: string[]) => ['admin', 'payment-summary', isSuperAdmin, ...ids] as const,
  // Member iuran ledger status
  memberIuranPaid:  (profileId: string)                    => ['member-iuran-paid', profileId]                   as const,
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
    supabase.from('charters').select('id, slug, name, city, country, description, hero_image_url').order('name'),
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

export interface MemberPublicProfile {
  id: string;
  name: string | null;
  avatar_url: string | null;
  city: string | null;
  profession: string | null;
  bio: string | null;
  nickname: string | null;
  funny_event: string | null;
  message_to_friends: string | null;
}

export async function fetchMemberById(id: string) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, city, profession, bio, nickname, funny_event, message_to_friends')
    .eq('id', id).eq('status', 'approved').single();
  must(profile, error);

  const { data: cms } = await supabase
    .from('charter_members')
    .select('charter_id, is_primary, charters(name, slug)')
    .eq('profile_id', id);

  return {
    profile: profile as unknown as MemberPublicProfile,
    memberships: (cms ?? []).map((cm: any) => ({
      charter_id: cm.charter_id, is_primary: cm.is_primary, charter: cm.charters,
    })),
  };
}

// ─── Phase 1 — Friends ────────────────────────────────────────────────────────

export interface FriendEntry {
  rank: number;
  friend: { id: string; name: string; avatar_url: string | null };
}

export async function fetchFriends(profileId: string): Promise<FriendEntry[]> {
  const { data: links } = await supabase
    .from('profile_friends')
    .select('rank, friend_id')
    .eq('profile_id', profileId)
    .order('rank');
  if (!links || links.length === 0) return [];

  const friendIds = links.map((l: any) => l.friend_id as string);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, avatar_url')
    .in('id', friendIds);

  const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));
  return links.map((l: any) => ({
    rank: l.rank as number,
    friend: profileMap[l.friend_id] ?? { id: l.friend_id, name: '?', avatar_url: null },
  }));
}

export async function saveFriends(profileId: string, entries: { friendId: string; rank: number }[]): Promise<void> {
  const { error: delErr } = await supabase.from('profile_friends').delete().eq('profile_id', profileId);
  if (delErr) throw delErr;
  if (entries.length === 0) return;
  const { error } = await supabase.from('profile_friends').insert(
    entries.map(e => ({ profile_id: profileId, friend_id: e.friendId, rank: e.rank }))
  );
  if (error) throw error;
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
    .select('id, type, storage_path, external_url, caption, year_taken, created_at, tags, charters!media_charter_id_fkey(id, name), profiles!media_profile_id_fkey(id, name)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });
  must(data, error);
  return (data ?? []).map((m: any) => {
    const primaryCharter = m.charters as { id: string; name: string } | null;
    return {
      id: m.id, type: m.type as 'photo' | 'video',
      storage_path: m.storage_path as string | null,
      external_url: m.external_url as string | null,
      caption: m.caption as string | null,
      year_taken: m.year_taken as number | null,
      created_at: m.created_at as string,
      tags: (m.tags ?? []) as string[],
      charter: primaryCharter,
      allCharters: primaryCharter ? [primaryCharter] : [],
      profile: m.profiles as { id: string; name: string } | null,
    };
  });
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
    .select('id, name, avatar_url, city, profession, status, reunion_attendance, created_at, charter_members(is_primary, charters(name))')
    .order('created_at', { ascending: false });
  const { data, error } = profileIds ? await q.in('id', profileIds) : await q;
  must(data, error);
  return (data ?? []).map((p: any) => {
    const primary = (p.charter_members ?? []).find((cm: any) => cm.is_primary);
    return { id: p.id, name: p.name, avatar_url: p.avatar_url,
             city: p.city, profession: p.profession, status: p.status as string,
             reunion_attendance: (p.reunion_attendance ?? null) as string | null,
             created_at: p.created_at as string,
             primaryCharter: primary?.charters?.name ?? null };
  });
}

export async function fetchAdminMedia(status: string, isSuperAdmin: boolean, charterIds: string[]) {
  let q = supabase
    .from('media')
    .select('id, type, storage_path, external_url, caption, year_taken, status, created_at, tags, charters!media_charter_id_fkey(id, name), profiles!media_profile_id_fkey(id, name)')
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
    tags: (m.tags ?? []) as string[],
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

// ─── Phase 2 — Payments ───────────────────────────────────────────────────────

export interface PaymentCredit {
  id:          string;
  payment_id:  string;
  profile_id:  string;
  credited_by: string | null;
  created_at:  string;
  profile?:    { name: string; avatar_url: string | null } | null;
}

export interface Payment {
  id:                    string;
  profile_id:            string;
  type:                  'reunion_fee' | 'donation';
  member_amount:         number;
  donation_amount:       number;
  admin_adjusted_amount: number | null;
  receipt_url:           string | null;
  status:                'submitted' | 'pending_review' | 'confirmed' | 'bank_reconciled' | 'rejected';
  member_notes:          string | null;
  admin_notes:           string | null;
  reviewed_by:           string | null;
  reviewed_at:           string | null;
  created_at:            string;
  updated_at:            string;
  profile?:              { name: string; avatar_url: string | null } | null;
  credits?:              PaymentCredit[];
}

export interface QRISConfig {
  qris_image_url:    string;
  qris_bank_name:    string;
  qris_account_no:   string;
  qris_account_name: string;
  reunion_fee_target: number;
  donation_target:    number;
}

const QRIS_KEYS = ['qris_image_url', 'qris_bank_name', 'qris_account_no', 'qris_account_name', 'reunion_fee_target', 'donation_target'];

export async function fetchQRISConfig(): Promise<QRISConfig> {
  const { data } = await supabase.from('site_settings').select('key, value').in('key', QRIS_KEYS);
  const m = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
  return {
    qris_image_url:    m['qris_image_url']    ?? '',
    qris_bank_name:    m['qris_bank_name']    ?? '',
    qris_account_no:   m['qris_account_no']   ?? '',
    qris_account_name: m['qris_account_name'] ?? '',
    reunion_fee_target: parseInt(m['reunion_fee_target'] ?? '1870000', 10),
    donation_target:    parseInt(m['donation_target']    ?? '10000000', 10),
  };
}

export async function setQRISConfig(cfg: QRISConfig): Promise<void> {
  const { error } = await supabase.from('site_settings').upsert(
    Object.entries(cfg).map(([key, value]) => ({ key, value: String(value) })),
    { onConflict: 'key' }
  );
  if (error) throw error;
}

export async function fetchMyPayments(profileId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });
  must(data, error);
  return (data ?? []) as Payment[];
}

export async function fetchAdminPayments(
  isSuperAdmin: boolean,
  charterIds: string[],
  type?: 'reunion_fee' | 'donation' | null,
  status?: string | null
): Promise<Payment[]> {
  const profileIds = await charterScope(isSuperAdmin, charterIds);

  let q = supabase
    .from('payments')
    .select('*, profiles!payments_profile_id_fkey(name, avatar_url), payment_credits(id, profile_id, credited_by, created_at, profiles!payment_credits_profile_id_fkey(name, avatar_url))')
    .order('created_at', { ascending: false });

  if (profileIds) q = q.in('profile_id', profileIds);
  if (type)       q = q.eq('type', type);
  if (status)     q = q.eq('status', status);

  const { data, error } = await q;
  must(data, error);
  return (data ?? []).map((r: any) => ({
    ...r,
    profile: r.profiles ?? null,
    credits: (r.payment_credits ?? []).map((c: any) => ({ ...c, profile: c.profiles ?? null })),
  })) as Payment[];
}

export async function submitPayment(input: {
  profileId:      string;
  type:           'reunion_fee' | 'donation';
  amount:         number;
  donationAmount: number;
  receiptUrl:     string | null;
  notes:          string | null;
}): Promise<void> {
  const { error } = await supabase.from('payments').insert({
    profile_id:      input.profileId,
    type:            input.type,
    member_amount:   input.amount,
    donation_amount: input.donationAmount,
    receipt_url:     input.receiptUrl,
    member_notes:    input.notes,
    status:          'submitted',
  });
  if (error) throw error;
}

export async function assignPaymentCredits(
  paymentId:  string,
  profileIds: string[],
  actorId:    string,
): Promise<void> {
  // Replace all existing credits for this payment
  const { error: delErr } = await supabase
    .from('payment_credits').delete().eq('payment_id', paymentId);
  if (delErr) throw delErr;

  if (profileIds.length > 0) {
    const { error: insErr } = await supabase.from('payment_credits').insert(
      profileIds.map(pid => ({ payment_id: paymentId, profile_id: pid, credited_by: actorId }))
    );
    if (insErr) throw insErr;
  }

  // Audit log — non-blocking (credits already saved above)
  const { error: auditErr } = await supabase.from('audit_log').insert({
    action:    'payment_credit_assigned',
    actor_id:  actorId,
    target_id: paymentId,
    details:   { credited_to: profileIds },
  });
  if (auditErr) console.error('[audit_log] insert failed:', auditErr.message, auditErr.details);
}

export async function updatePaymentAdmin(
  id: string,
  patch: { admin_adjusted_amount?: number | null; status?: string; admin_notes?: string | null; reviewed_by?: string }
): Promise<void> {
  const { error } = await supabase
    .from('payments')
    .update({ ...patch, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;

  // Audit log
  const { error: auditErr } = await supabase.from('audit_log').insert({
    action:    'payment_status_updated',
    actor_id:  patch.reviewed_by ?? null,
    target_id: id,
    details:   { status: patch.status, admin_adjusted_amount: patch.admin_adjusted_amount ?? null },
  });
  if (auditErr) console.error('[audit_log] insert failed:', auditErr.message, auditErr.details);
}

export interface MemberPaymentSummary {
  id:              string;
  name:            string | null;
  avatar_url:      string | null;
  primaryCharter:  string | null;
  iuranAmount:     number | null;   // null = belum bayar
  iuranStatus:     string | null;   // 'confirmed'|'submitted'|'pending_review'|'rejected'|'credited'
  iuranCreditedBy: string | null;   // payer name when status === 'credited'
  donationTotal:   number;          // sum of confirmed donations
}

const IURAN_PRIORITY = ['confirmed', 'submitted', 'pending_review', 'rejected'];

export async function fetchPaymentSummaryReport(
  isSuperAdmin: boolean,
  charterIds: string[],
): Promise<MemberPaymentSummary[]> {
  const profileIds = await charterScope(isSuperAdmin, charterIds);

  const mq = supabase
    .from('profiles')
    .select('id, name, avatar_url, charter_members(is_primary, charters(name))')
    .eq('status', 'approved')
    .order('name');
  const { data: members, error: mErr } = profileIds ? await mq.in('id', profileIds) : await mq;
  must(members, mErr);

  // Own payments (for status tracking — submitted/pending/rejected still shown)
  const pq = supabase
    .from('payments')
    .select('id, profile_id, type, status, member_amount, admin_adjusted_amount');
  const { data: payments } = profileIds ? await pq.in('profile_id', profileIds) : await pq;

  // Ledger: iuran account balances from account_transactions
  // Each row: account belongs to a member (profile_id NOT NULL), type = 'iuran'
  // Sum of amounts = how much has been allocated to this member's iuran account
  const { data: iuranTxns } = await supabase
    .from('account_transactions')
    .select('amount, payment_id, member_accounts!inner(profile_id, account_type), payments!inner(status, profiles!payments_profile_id_fkey(name))')
    .eq('member_accounts.account_type', 'iuran')
    .not('member_accounts.profile_id', 'is', null);

  // Ledger: donation pool transactions
  const { data: donTxns } = await supabase
    .from('account_transactions')
    .select('amount, payment_id, member_accounts!inner(profile_id, account_type), payments!inner(profile_id, status)')
    .eq('member_accounts.account_type', 'donation')
    .is('member_accounts.profile_id', null)
    .eq('payments.status', 'confirmed');

  // Build iuran ledger map: profile_id → { amount, payer_name | null }
  // payer_name is non-null when someone else paid for this member
  const iuranLedger = new Map<string, { amount: number; payerName: string | null }>();
  for (const t of iuranTxns ?? []) {
    const ma = (t as any).member_accounts;
    const p  = (t as any).payments;
    if (!ma?.profile_id) continue;
    const existing = iuranLedger.get(ma.profile_id);
    const amount   = existing ? existing.amount + (t.amount as number) : (t.amount as number);
    // payerName = payer of the payment, but only meaningful when payer ≠ beneficiary
    const payerName = p?.profiles?.name ?? null;
    iuranLedger.set(ma.profile_id, { amount, payerName: existing?.payerName ?? payerName });
  }

  // Build donation map: payer profile_id → total donated via ledger pool entries
  const donByProfile = new Map<string, number>();
  for (const t of donTxns ?? []) {
    const payerProfileId = (t as any).payments?.profile_id;
    if (!payerProfileId) continue;
    donByProfile.set(payerProfileId, (donByProfile.get(payerProfileId) ?? 0) + (t.amount as number));
  }

  // Group own payments by profile
  const byProfile = new Map<string, any[]>();
  for (const p of payments ?? []) {
    if (!byProfile.has(p.profile_id)) byProfile.set(p.profile_id, []);
    byProfile.get(p.profile_id)!.push(p);
  }

  return (members ?? []).map((m: any) => {
    const primary = (m.charter_members ?? []).find((cm: any) => cm.is_primary);
    const all     = byProfile.get(m.id) ?? [];

    // Ledger-first: check if there are confirmed allocations for this member's iuran
    const ledger = iuranLedger.get(m.id);

    // Also check own submitted/pending payments (not yet allocated)
    const iuranList = all.filter((p: any) => p.type === 'reunion_fee');
    let bestOwn: any = null;
    for (const s of IURAN_PRIORITY) {
      bestOwn = iuranList.find((p: any) => p.status === s) ?? null;
      if (bestOwn) break;
    }

    // Determine iuran status:
    // 1. If ledger has entry → confirmed (credited by ledger allocation)
    // 2. Else use best own payment status
    let iuranStatus:     string | null = null;
    let iuranAmount:     number | null = null;
    let iuranCreditedBy: string | null = null;

    if (ledger) {
      iuranStatus = 'confirmed';
      iuranAmount = ledger.amount;
      // If there's no own confirmed payment but ledger exists → someone else paid
      const hasOwnConfirmed = bestOwn?.status === 'confirmed';
      if (!hasOwnConfirmed) {
        iuranCreditedBy = ledger.payerName;
        iuranStatus     = 'credited';
      }
    } else if (bestOwn) {
      iuranStatus = bestOwn.status;
      iuranAmount = bestOwn.admin_adjusted_amount ?? bestOwn.member_amount;
    }

    // Donation total: ledger pool entries (allocated portion of any payment)
    // + standalone donation-type payments not yet in ledger
    const ledgerDonation = donByProfile.get(m.id) ?? 0;
    const standaloneDonation = all
      .filter((p: any) => p.type === 'donation' && p.status === 'confirmed')
      .reduce((sum: number, p: any) => sum + (p.admin_adjusted_amount ?? p.member_amount), 0);
    const donationTotal = ledgerDonation + standaloneDonation;

    return {
      id:              m.id,
      name:            m.name,
      avatar_url:      m.avatar_url,
      primaryCharter:  primary?.charters?.name ?? null,
      iuranAmount,
      iuranStatus,
      iuranCreditedBy,
      donationTotal,
    };
  });
}

// ─── Ledger: member_accounts + account_transactions ──────────────────────────

export type AccountType = 'iuran' | 'donation' | 'merchandise';

export interface LedgerAllocation {
  profileId:   string | null;  // null = pool account
  accountType: AccountType;
  amount:      number;
  note?:       string;
}

export interface LedgerEntry {
  id:          string;
  account_id:  string;
  amount:      number;
  payment_id:  string | null;
  created_by:  string | null;
  created_at:  string;
  note:        string | null;
  profile_id:  string | null;
  accountType: AccountType;
}

async function getOrCreateMemberAccount(profileId: string | null, accountType: AccountType): Promise<string> {
  let q = supabase.from('member_accounts').select('id').eq('account_type', accountType);
  q = profileId ? (q as any).eq('profile_id', profileId) : (q as any).is('profile_id', null);
  const { data: existing } = await q.maybeSingle();
  if (existing) return (existing as any).id as string;

  const { data, error } = await supabase
    .from('member_accounts')
    .insert({ profile_id: profileId, account_type: accountType })
    .select('id')
    .single();
  if (error) throw error;
  return (data as any).id as string;
}

export async function fetchPaymentAllocations(paymentId: string): Promise<LedgerEntry[]> {
  const { data, error } = await supabase
    .from('account_transactions')
    .select('id, account_id, amount, payment_id, created_by, created_at, note, member_accounts(profile_id, account_type)')
    .eq('payment_id', paymentId)
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id:          r.id,
    account_id:  r.account_id,
    amount:      r.amount as number,
    payment_id:  r.payment_id,
    created_by:  r.created_by,
    created_at:  r.created_at,
    note:        r.note,
    profile_id:  r.member_accounts?.profile_id ?? null,
    accountType: r.member_accounts?.account_type as AccountType,
  }));
}

export async function savePaymentAllocations(
  paymentId:    string,
  allocations:  LedgerAllocation[],
  createdBy:    string,
): Promise<void> {
  // Resolve / create account IDs
  const resolved = await Promise.all(
    allocations.map(async a => ({
      account_id: await getOrCreateMemberAccount(a.profileId, a.accountType),
      amount:     a.amount,
      payment_id: paymentId,
      created_by: createdBy,
      note:       a.note ?? null,
    }))
  );

  // Replace existing transactions for this payment
  const { error: delErr } = await supabase
    .from('account_transactions')
    .delete()
    .eq('payment_id', paymentId);
  if (delErr) throw delErr;

  if (resolved.length > 0) {
    const { error: insErr } = await supabase.from('account_transactions').insert(resolved);
    if (insErr) throw insErr;
  }

  // Audit log (non-blocking)
  supabase.from('audit_log').insert({
    action:    'payment_allocated',
    actor_id:  createdBy,
    target_id: paymentId,
    details:   { allocations: allocations.map(a => ({ type: a.accountType, amount: a.amount, for: a.profileId })) },
  }).then(({ error }) => {
    if (error) console.error('[audit_log] insert failed:', error.message);
  });
}

// Returns true if the member has at least one credit in their iuran account_transactions
export async function fetchMemberIuranPaid(profileId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('account_transactions')
    .select('id, member_accounts!inner(profile_id, account_type)')
    .eq('member_accounts.profile_id', profileId)
    .eq('member_accounts.account_type', 'iuran')
    .limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function fetchPaymentTotals(): Promise<{ reunion_fee: number; donation: number }> {
  const { data } = await supabase
    .from('payments')
    .select('type, member_amount, admin_adjusted_amount')
    .eq('status', 'confirmed');
  const totals = { reunion_fee: 0, donation: 0 };
  (data ?? []).forEach((p: any) => {
    const amt = (p.admin_adjusted_amount ?? p.member_amount) as number;
    if (p.type === 'reunion_fee') totals.reunion_fee += amt;
    else if (p.type === 'donation') totals.donation += amt;
  });
  return totals;
}

// ─── Finance Admin ────────────────────────────────────────────────────────────

export interface FinanceAdmin {
  profile_id: string;
  name:       string | null;
  avatar_url: string | null;
}

export async function fetchFinanceAdmins(): Promise<FinanceAdmin[]> {
  const { data, error } = await supabase
    .from('finance_admins')
    .select('profile_id, profiles!finance_admins_profile_id_fkey(name, avatar_url)');
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    profile_id: r.profile_id as string,
    name:       (r.profiles?.name       ?? null) as string | null,
    avatar_url: (r.profiles?.avatar_url ?? null) as string | null,
  }));
}

export async function grantFinanceAdmin(profileId: string): Promise<void> {
  const { error } = await supabase.from('finance_admins').insert({ profile_id: profileId });
  if (error) throw error;
}

export async function revokeFinanceAdmin(profileId: string): Promise<void> {
  const { error } = await supabase.from('finance_admins').delete().eq('profile_id', profileId);
  if (error) throw error;
}

export async function fetchConfirmedPayments(): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*, profiles!payments_profile_id_fkey(name, avatar_url), payment_credits(id, profile_id, credited_by, created_at, profiles!payment_credits_profile_id_fkey(name, avatar_url))')
    .in('status', ['confirmed', 'bank_reconciled'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    ...r,
    profile:  r.profiles ?? null,
    credits:  (r.payment_credits ?? []).map((c: any) => ({ ...c, profile: c.profiles ?? null })),
  })) as Payment[];
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

// ─── Phase 3 — Merchandise ────────────────────────────────────────────────────

export interface MerchandiseItem {
  id:              string;
  name:            string;
  description:     string | null;
  image_url:       string | null;
  price:           number;
  cost:            number;
  stock_total:     number;
  stock_remaining: number;
  is_active:       boolean;
  created_at:      string;
  updated_at:      string;
}

export interface AdminMerchandiseItem extends MerchandiseItem {
  sold: number;
}

export interface MerchandiseOrder {
  id:                    string;
  profile_id:            string;
  merchandise_id:        string;
  quantity:              number;
  member_amount:         number;
  admin_adjusted_amount: number | null;
  receipt_url:           string | null;
  status:                'submitted' | 'pending_review' | 'confirmed' | 'rejected' | 'shipped';
  member_notes:          string | null;
  admin_notes:           string | null;
  shipping_address:      string | null;
  reviewed_by:           string | null;
  reviewed_at:           string | null;
  created_at:            string;
  updated_at:            string;
  merchandise?: { name: string; image_url: string | null; price: number } | null;
  profile?:     { name: string; avatar_url: string | null } | null;
}

function computeStockRemaining(
  items: any[],
  soldData: any[]
): MerchandiseItem[] {
  const soldCounts: Record<string, number> = {};
  (soldData ?? []).forEach((r: any) => {
    soldCounts[r.merchandise_id] = (soldCounts[r.merchandise_id] ?? 0) + (r.quantity as number);
  });
  return items.map((item: any) => ({
    ...item,
    price:           Number(item.price),
    cost:            Number(item.cost ?? 0),
    stock_remaining: Math.max(0, item.stock_total - (soldCounts[item.id] ?? 0)),
  }));
}

export async function fetchMerchandiseItems(): Promise<MerchandiseItem[]> {
  const [{ data: items }, { data: soldData }] = await Promise.all([
    supabase.from('merchandise').select('*').eq('is_active', true).order('created_at'),
    supabase.from('merchandise_orders').select('merchandise_id, quantity').in('status', ['confirmed', 'shipped']),
  ]);
  return computeStockRemaining(items ?? [], soldData ?? []);
}

export async function fetchAdminMerchandise(): Promise<AdminMerchandiseItem[]> {
  const [{ data: items }, { data: soldData }] = await Promise.all([
    supabase.from('merchandise').select('*').order('created_at', { ascending: false }),
    supabase.from('merchandise_orders').select('merchandise_id, quantity').in('status', ['confirmed', 'shipped']),
  ]);

  const soldCounts: Record<string, number> = {};
  (soldData ?? []).forEach((r: any) => {
    soldCounts[r.merchandise_id] = (soldCounts[r.merchandise_id] ?? 0) + (r.quantity as number);
  });

  return (items ?? []).map((item: any) => ({
    ...item,
    price:           Number(item.price),
    stock_remaining: Math.max(0, item.stock_total - (soldCounts[item.id] ?? 0)),
    sold:            soldCounts[item.id] ?? 0,
  }));
}

export async function createMerchandiseItem(item: {
  name:         string;
  description?: string | null;
  image_url?:   string | null;
  price:        number;
  cost?:        number;
  stock_total:  number;
}): Promise<void> {
  const { error } = await supabase.from('merchandise').insert(item);
  if (error) throw error;
}

export async function updateMerchandiseItem(
  id: string,
  patch: Partial<{
    name:        string;
    description: string | null;
    image_url:   string | null;
    price:       number;
    cost:        number;
    stock_total: number;
    is_active:   boolean;
  }>
): Promise<void> {
  const { error } = await supabase.from('merchandise').update(patch).eq('id', id);
  if (error) throw error;
}

export async function fetchMyOrders(profileId: string): Promise<MerchandiseOrder[]> {
  const { data, error } = await supabase
    .from('merchandise_orders')
    .select('*, merchandise:merchandise_id(name, image_url, price)')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });
  must(data, error);
  return (data ?? []).map((o: any) => ({
    ...o,
    member_amount:         Number(o.member_amount),
    admin_adjusted_amount: o.admin_adjusted_amount ? Number(o.admin_adjusted_amount) : null,
    merchandise:           o.merchandise
      ? { ...o.merchandise, price: Number(o.merchandise.price) }
      : null,
  })) as MerchandiseOrder[];
}

export async function fetchAdminOrders(
  isSuperAdmin: boolean,
  charterIds: string[],
): Promise<MerchandiseOrder[]> {
  const profileIds = await charterScope(isSuperAdmin, charterIds);
  let q = supabase
    .from('merchandise_orders')
    .select('*, merchandise:merchandise_id(name, image_url, price), profile:profile_id(name, avatar_url)')
    .order('created_at', { ascending: false });
  if (profileIds) q = q.in('profile_id', profileIds);
  const { data, error } = await q;
  must(data, error);
  return (data ?? []).map((o: any) => ({
    ...o,
    member_amount:         Number(o.member_amount),
    admin_adjusted_amount: o.admin_adjusted_amount ? Number(o.admin_adjusted_amount) : null,
    merchandise:           o.merchandise
      ? { ...o.merchandise, price: Number(o.merchandise.price) }
      : null,
  })) as MerchandiseOrder[];
}

export async function submitOrder(order: {
  profile_id:       string;
  merchandise_id:   string;
  quantity:         number;
  member_amount:    number;
  receipt_url?:     string | null;
  member_notes?:    string | null;
  shipping_address: string;
}): Promise<void> {
  const { error } = await supabase.from('merchandise_orders').insert(order);
  if (error) throw error;
}

export async function updateOrderAdmin(
  id: string,
  patch: {
    status?:                 MerchandiseOrder['status'];
    admin_adjusted_amount?:  number | null;
    admin_notes?:            string | null;
    reviewed_by?:            string;
  }
): Promise<void> {
  const { error } = await supabase
    .from('merchandise_orders')
    .update({ ...patch, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function fetchMerchandiseTotals(): Promise<{ confirmed: number; pending: number }> {
  const { data } = await supabase
    .from('merchandise_orders')
    .select('quantity, status');
  const orders = data ?? [];
  return {
    confirmed: orders
      .filter((o: any) => o.status === 'confirmed' || o.status === 'shipped')
      .reduce((s: number, o: any) => s + (o.quantity as number), 0),
    pending: orders.filter((o: any) => o.status === 'submitted').length,
  };
}

export async function fetchMerchandiseMargin(): Promise<number> {
  const { data } = await supabase
    .from('merchandise_orders')
    .select('quantity, merchandise:merchandise_id(price, cost)')
    .in('status', ['confirmed', 'shipped']);
  return (data ?? []).reduce((sum: number, o: any) => {
    const price = Number(o.merchandise?.price ?? 0);
    const cost  = Number(o.merchandise?.cost  ?? 0);
    return sum + (price - cost) * (o.quantity as number);
  }, 0);
}

// ─── Phase 4 — Comments ───────────────────────────────────────────────────────

export interface MediaComment {
  id:         string;
  media_id:   string;
  body:       string;
  created_at: string;
  parent_id:  string | null;
  profile:    { id: string; name: string; avatar_url: string | null };
  replies?:   MediaComment[];
}

export async function fetchComments(mediaId: string): Promise<MediaComment[]> {
  const { data } = await supabase
    .from('media_comments')
    .select('id, media_id, body, created_at, parent_id, profile:profiles(id, name, avatar_url)')
    .eq('media_id', mediaId)
    .order('created_at', { ascending: true });
  const flat = (data ?? []) as unknown as MediaComment[];
  // Build tree: top-level comments with replies nested
  const map = new Map<string, MediaComment>();
  flat.forEach(c => map.set(c.id, { ...c, replies: [] }));
  const roots: MediaComment[] = [];
  map.forEach(c => {
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.replies!.push(c);
    } else {
      roots.push(c);
    }
  });
  return roots;
}

export async function addComment(mediaId: string, body: string, parentId?: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('media_comments')
    .insert({ media_id: mediaId, profile_id: user.id, body: body.trim(), parent_id: parentId ?? null });
  if (error) throw error;
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase.from('media_comments').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchLatestComment(): Promise<{ body: string; profileName: string } | null> {
  const { data } = await supabase
    .from('media_comments')
    .select('body, profile:profiles(name)')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { body: (data as any).body, profileName: (data as any).profile?.name ?? 'Alumni' };
}

// ─── Phase 7.3 — Charter Management ─────────────────────────────────────────

export interface AdminCharter {
  id:              string;
  slug:            string;
  name:            string;
  city:            string;
  country:         string;
  description:     string | null;
  hero_image_url:  string | null;
  announcement:    string | null;
  is_active:       boolean;
  memberCount:     number;
}

export async function fetchAdminCharters(): Promise<AdminCharter[]> {
  const [{ data: charterData, error }, { data: memberData }] = await Promise.all([
    supabase
      .from('charters')
      .select('id, slug, name, city, country, description, hero_image_url, announcement, is_active')
      .order('name'),
    supabase.from('charter_members').select('charter_id'),
  ]);
  must(charterData, error);
  const counts: Record<string, number> = {};
  (memberData ?? []).forEach((cm: any) => {
    counts[cm.charter_id] = (counts[cm.charter_id] ?? 0) + 1;
  });
  return (charterData ?? []).map((c: any) => ({ ...c, memberCount: counts[c.id] ?? 0 }));
}

export async function createCharter(charter: {
  name:    string;
  slug:    string;
  city:    string;
  country: string;
}): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('charters')
    .insert({ ...charter, is_active: true })
    .select('id')
    .single();
  must(data, error);
  return data as { id: string };
}

export async function updateCharter(
  id: string,
  patch: { name?: string; slug?: string; city?: string; country?: string; is_active?: boolean }
): Promise<void> {
  const { error } = await supabase.from('charters').update(patch).eq('id', id);
  if (error) throw error;
}

export interface CharterMember {
  profile_id: string;
  is_primary:  boolean;
  profile:     { name: string | null; avatar_url: string | null; city: string | null; profession: string | null };
}

export async function fetchCharterMembers(charterId: string): Promise<CharterMember[]> {
  const { data: links, error } = await supabase
    .from('charter_members')
    .select('profile_id, is_primary')
    .eq('charter_id', charterId);
  must(links, error);
  if (!links || links.length === 0) return [];

  const profileIds = links.map((l: any) => l.profile_id as string);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, city, profession')
    .in('id', profileIds);

  const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));
  return links.map((l: any) => ({
    profile_id: l.profile_id,
    is_primary:  l.is_primary,
    profile:     profileMap[l.profile_id] ?? { name: null, avatar_url: null, city: null, profession: null },
  }));
}

export async function addMemberToCharter(charterId: string, profileId: string): Promise<void> {
  const { error } = await supabase
    .from('charter_members')
    .insert({ charter_id: charterId, profile_id: profileId, is_primary: false });
  if (error) throw error;
}

export async function removeMemberFromCharter(charterId: string, profileId: string): Promise<void> {
  const { error } = await supabase
    .from('charter_members')
    .delete()
    .eq('charter_id', charterId)
    .eq('profile_id', profileId);
  if (error) throw error;
}

export async function setPrimaryCharter(charterId: string, profileId: string, isPrimary: boolean): Promise<void> {
  const { error } = await supabase
    .from('charter_members')
    .update({ is_primary: isPrimary })
    .eq('charter_id', charterId)
    .eq('profile_id', profileId);
  if (error) throw error;
}

// ─── Phase 7.4 — Admin Backdrop ───────────────────────────────────────────────

export interface AdminBackdrop { url: string; opacity: number; }

export async function fetchAdminBackdrop(): Promise<AdminBackdrop> {
  const { data } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['admin_backdrop_url', 'admin_backdrop_opacity']);
  const m = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value as string]));
  return {
    url:     m['admin_backdrop_url']     ?? '',
    opacity: parseInt(m['admin_backdrop_opacity'] ?? '15', 10),
  };
}

export async function setAdminBackdrop(b: AdminBackdrop): Promise<void> {
  const { error } = await supabase.from('site_settings').upsert([
    { key: 'admin_backdrop_url',     value: b.url },
    { key: 'admin_backdrop_opacity', value: String(b.opacity) },
  ], { onConflict: 'key' });
  if (error) throw error;
}

export async function fetchBudgetTarget(): Promise<number> {
  const { data } = await supabase
    .from('site_settings')
    .select('key, value')
    .eq('key', 'budget_total_target')
    .maybeSingle();
  return data ? parseInt((data as any).value ?? '247000000', 10) : 247_000_000;
}

// ─── Financial Report ─────────────────────────────────────────────────────────

export type FinancialTxType   = 'reunion_fee' | 'donation' | 'merchandise';
export type FinancialTxStatus =
  | 'submitted' | 'pending_review' | 'confirmed' | 'bank_reconciled' | 'shipped' | 'rejected';

export interface FinancialReportRow {
  id:              string;
  rowType:         'payment' | 'merchandise';
  txType:          FinancialTxType;
  status:          FinancialTxStatus;
  created_at:      string;
  profile:         { id: string; name: string; avatar_url: string | null };
  charter:         { id: string; name: string } | null;
  memberAmount:    number;
  effectiveAmount: number;
  // Merchandise-specific (null for payments)
  itemName:    string | null;
  quantity:    number | null;
  unitPrice:   number | null;
  unitCost:    number | null;
  totalRevenue: number | null; // unitPrice × quantity (catalog selling price)
  totalMargin:  number | null; // (unitPrice - unitCost) × quantity
}

function pickCharter(profile: any): { id: string; name: string } | null {
  const cms: any[] = profile?.charter_members ?? [];
  const primary = cms.find((c: any) => c.is_primary) ?? cms[0];
  return primary?.charter ?? null;
}

export async function fetchFinancialReport(): Promise<FinancialReportRow[]> {
  const [{ data: payments }, { data: orders }] = await Promise.all([
    supabase
      .from('payments')
      .select(`
        id, type, member_amount, admin_adjusted_amount, status, created_at,
        profile:profiles(
          id, name, avatar_url,
          charter_members(is_primary, charter:charters(id, name))
        )
      `)
      .order('created_at', { ascending: false }),
    supabase
      .from('merchandise_orders')
      .select(`
        id, quantity, member_amount, admin_adjusted_amount, status, created_at,
        profile:profiles(
          id, name, avatar_url,
          charter_members(is_primary, charter:charters(id, name))
        ),
        merchandise:merchandise_id(id, name, price, cost)
      `)
      .order('created_at', { ascending: false }),
  ]);

  const paymentRows: FinancialReportRow[] = (payments ?? []).map((p: any) => ({
    id:              p.id,
    rowType:         'payment',
    txType:          p.type as FinancialTxType,
    status:          p.status as FinancialTxStatus,
    created_at:      p.created_at,
    profile:         { id: p.profile.id, name: p.profile.name, avatar_url: p.profile.avatar_url },
    charter:         pickCharter(p.profile),
    memberAmount:    p.member_amount,
    effectiveAmount: p.admin_adjusted_amount ?? p.member_amount,
    itemName:    null,
    quantity:    null,
    unitPrice:   null,
    unitCost:    null,
    totalRevenue: null,
    totalMargin:  null,
  }));

  const orderRows: FinancialReportRow[] = (orders ?? []).map((o: any) => {
    const price = Number(o.merchandise?.price ?? 0);
    const cost  = Number(o.merchandise?.cost  ?? 0);
    const qty   = Number(o.quantity ?? 1);
    return {
      id:              o.id,
      rowType:         'merchandise',
      txType:          'merchandise',
      status:          o.status as FinancialTxStatus,
      created_at:      o.created_at,
      profile:         { id: o.profile.id, name: o.profile.name, avatar_url: o.profile.avatar_url },
      charter:         pickCharter(o.profile),
      memberAmount:    o.member_amount,
      effectiveAmount: o.admin_adjusted_amount ?? o.member_amount,
      itemName:    o.merchandise?.name ?? null,
      quantity:    qty,
      unitPrice:   price,
      unitCost:    cost,
      totalRevenue: price * qty,
      totalMargin:  (price - cost) * qty,
    };
  });

  return [...paymentRows, ...orderRows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

// ─── Keringanan (financial assistance requests) ───────────────────────────────

export interface KeringananRequest {
  id:             string;
  profile_id:     string;
  name:           string;
  contact_number: string;
  email:          string;
  jumlah_sanggup: number;
  alasan:         string;
  status:         'pending' | 'approved' | 'rejected';
  admin_notes:    string | null;
  created_at:     string;
  updated_at:     string;
}

export async function fetchMyKeringanan(profileId: string): Promise<KeringananRequest | null> {
  const { data } = await supabase
    .from('keringanan_requests')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as KeringananRequest | null;
}

export async function submitKeringanan(req: {
  profileId:     string;
  name:          string;
  contactNumber: string;
  email:         string;
  jumlahSanggup: number;
  alasan:        string;
}): Promise<void> {
  const { error } = await supabase.from('keringanan_requests').insert({
    profile_id:     req.profileId,
    name:           req.name,
    contact_number: req.contactNumber,
    email:          req.email,
    jumlah_sanggup: req.jumlahSanggup,
    alasan:         req.alasan,
  });
  if (error) throw error;
}

export async function fetchAllKeringanan(): Promise<KeringananRequest[]> {
  const { data, error } = await supabase
    .from('keringanan_requests')
    .select('*')
    .order('created_at', { ascending: false });
  must(data, error);
  return (data ?? []) as KeringananRequest[];
}

export async function updateKeringananStatus(
  id: string,
  status: 'approved' | 'rejected',
  adminNotes?: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('keringanan_requests')
    .update({ status, admin_notes: adminNotes ?? null, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ─── Generic site setting ─────────────────────────────────────────────────────

export async function fetchSiteSetting(key: string): Promise<string> {
  const { data } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  return (data as any)?.value ?? '';
}

export async function setSiteSetting(key: string, value: string): Promise<void> {
  const { error } = await supabase
    .from('site_settings')
    .upsert({ key, value }, { onConflict: 'key' });
  if (error) throw error;
}
