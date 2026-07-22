// daily-report — sends the daily reunion status report to WhatsApp via Fonnte.
//
// Fires once a day from pg_cron (see supabase/migrations/20260722_daily_report_cron.sql),
// which POSTs here with an `x-cron-secret` header. Can also be triggered manually with the
// same header for testing. Computes the same three dashboard cards (Rekap Kehadiran,
// Kehadiran per Kelas, Dana Terkumpul) via the existing SECURITY DEFINER RPCs, formats an
// Indonesian WhatsApp message, and sends it through the Fonnte gateway.
//
// Env (set as Edge Function secrets):
//   FONNTE_TOKEN      — Fonnte device API token (Authorization header value)
//   REPORT_RECIPIENT  — WhatsApp number(s) in 62… format, comma-separated for multiple
//   CRON_SECRET       — shared secret the cron job must present in x-cron-secret
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — auto-injected by the platform
//
// Deployed with verify_jwt = false; access is gated by CRON_SECRET instead (so a leaked
// anon key can't trigger WhatsApp sends / burn the Fonnte quota).

import { createClient } from 'npm:@supabase/supabase-js@2';

interface RosterStat {
  kelas: string;
  total: number;
  hadir: number;
  belum_tahu: number;
  belum_isi: number;
  rip: number;
  belum_daftar: number;
}

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

const rupiah = (n: number) =>
  'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n || 0));

Deno.serve(async (req) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  // ── Auth: shared cron secret ──────────────────────────────────────────────
  const secret = Deno.env.get('CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // ── Data: the three dashboard cards ─────────────────────────────────────
    const [rosterRes, fundRes] = await Promise.all([
      admin.rpc('get_roster_stats'),
      admin.rpc('get_fund_totals'),
    ]);
    if (rosterRes.error) return json({ error: `get_roster_stats: ${rosterRes.error.message}` }, 500);
    if (fundRes.error)   return json({ error: `get_fund_totals: ${fundRes.error.message}` }, 500);

    const stats = (rosterRes.data ?? []) as RosterStat[];
    const fund  = (fundRes.data?.[0] ?? { reunion_fee: 0, donation: 0 }) as
      { reunion_fee: number; donation: number };

    const t = stats.reduce(
      (a, s) => ({
        total:        a.total        + Number(s.total),
        hadir:        a.hadir        + Number(s.hadir),
        belum_tahu:   a.belum_tahu   + Number(s.belum_tahu),
        belum_isi:    a.belum_isi    + Number(s.belum_isi),
        rip:          a.rip          + Number(s.rip),
        belum_daftar: a.belum_daftar + Number(s.belum_daftar),
      }),
      { total: 0, hadir: 0, belum_tahu: 0, belum_isi: 0, rip: 0, belum_daftar: 0 },
    );

    const totalDana = Number(fund.reunion_fee) + Number(fund.donation);

    // ── Format: Indonesian WhatsApp message (WA uses *bold*) ─────────────────
    const tanggal = new Intl.DateTimeFormat('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      timeZone: 'Asia/Jakarta',
    }).format(new Date());

    const kelasLines = stats
      .map((s) => `• ${s.kelas}: ${s.hadir}/${s.total} hadir (${pct(s.hadir, s.total)}%)`)
      .join('\n');

    const message = [
      `📊 *Laporan Harian Reuni 87*`,
      `🗓️ ${tanggal}`,
      ``,
      `*━━ Rekap Kehadiran ━━*`,
      `✅ Hadir: ${t.hadir} (${pct(t.hadir, t.total)}%)`,
      `🤔 Belum Tahu: ${t.belum_tahu} (${pct(t.belum_tahu, t.total)}%)`,
      `📝 Belum Isi: ${t.belum_isi} (${pct(t.belum_isi, t.total)}%)`,
      `🕊️ Almarhum/ah: ${t.rip}`,
      `⬜ Belum Daftar: ${t.belum_daftar} (${pct(t.belum_daftar, t.total)}%)`,
      `👥 Total Alumni: ${t.total}`,
      ``,
      `*━━ Kehadiran per Kelas ━━*`,
      kelasLines || '_(belum ada data)_',
      ``,
      `*━━ Dana Terkumpul ━━*`,
      `💰 Iuran: ${rupiah(Number(fund.reunion_fee))}`,
      `🎁 Donasi: ${rupiah(Number(fund.donation))}`,
      `Σ Total: *${rupiah(totalDana)}*`,
    ].join('\n');

    // ── Send: Fonnte gateway ────────────────────────────────────────────────
    const token     = Deno.env.get('FONNTE_TOKEN');
    const recipient = Deno.env.get('REPORT_RECIPIENT');
    if (!token || !recipient) {
      return json({ error: 'FONNTE_TOKEN / REPORT_RECIPIENT not configured' }, 500);
    }

    const fonnteRes = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ target: recipient, message }),
    });
    const fonnteBody = await fonnteRes.json().catch(() => ({}));

    // Fonnte returns { status: true, ... } on success
    if (!fonnteRes.ok || fonnteBody?.status === false) {
      return json({ error: 'Fonnte send failed', fonnte: fonnteBody }, 502);
    }

    return json({ success: true, sent_to: recipient, fonnte: fonnteBody, message });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
