#!/usr/bin/env node
/**
 * migrate-to-r2.js
 * Copies all media rows from Supabase Storage / VPS → Cloudflare R2 via the Worker.
 *
 * Usage:
 *   node scripts/migrate-to-r2.js [--dry-run]
 *
 * Required env vars (set in a .env file or shell):
 *   SUPABASE_URL          https://xxxx.supabase.co
 *   SUPABASE_SERVICE_KEY  service_role key (bypasses RLS)
 *   R2_ADMIN_JWT          a valid Supabase JWT (run: node scripts/get-jwt.js)
 *   R2_WORKER_URL         https://media.top87.id  (optional, defaults to this)
 */

const https = require('https');
const http  = require('http');
const path  = require('path');
const fs    = require('fs');

// ── Config ──────────────────────────────────────────────────────────────────

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL        = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const R2_ADMIN_JWT        = process.env.R2_ADMIN_JWT;
const R2_WORKER_URL       = (process.env.R2_WORKER_URL ?? 'https://media.top87.id').replace(/\/$/, '');
const DRY_RUN             = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !R2_ADMIN_JWT) {
  console.error('Missing env vars. Need: SUPABASE_URL, SUPABASE_SERVICE_KEY, R2_ADMIN_JWT');
  process.exit(1);
}

const ANON_ID = 'migration';

// ── Helpers ──────────────────────────────────────────────────────────────────

function supabaseFetch(path, opts = {}) {
  return fetchJson(`${SUPABASE_URL}${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...opts.headers,
    },
  });
}

function fetchJson(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.request(url, { method: opts.method ?? 'GET', headers: opts.headers ?? {} }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: body ? JSON.parse(body) : null });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    lib.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] ?? 'application/octet-stream' }));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function uploadToR2(buffer, contentType, userId, ext) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(`${R2_WORKER_URL}/upload`);
    const lib = parsed.protocol === 'https:' ? https : http;
    const opts = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${R2_ADMIN_JWT}`,
        'X-User-Id': userId,
        'X-File-Ext': ext,
        'Content-Type': contentType,
        'Content-Length': buffer.length,
      },
    };
    const req = lib.request(opts, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(body)); }
          catch { reject(new Error(`Bad JSON from Worker: ${body}`)); }
        } else {
          reject(new Error(`Worker ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.write(buffer);
    req.end();
  });
}

function updateMediaRow(id, newUrl) {
  return supabaseFetch(`/rest/v1/media?id=eq.${id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ storage_path: newUrl }),
  });
}

function extFromUrl(url) {
  return (url.split('?')[0].split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🚀 TOP87 media → R2 migration (${DRY_RUN ? 'DRY RUN' : 'LIVE'})`);
  console.log(`   Worker: ${R2_WORKER_URL}\n`);

  // Fetch all media rows
  const { data: rows } = await supabaseFetch('/rest/v1/media?select=id,storage_path,profile_id&order=created_at.asc&limit=1000');
  if (!Array.isArray(rows)) {
    console.error('Failed to fetch media rows:', rows);
    process.exit(1);
  }

  const already = rows.filter(r => r.storage_path?.startsWith('https://media.top87.id/media/'));
  const toMove   = rows.filter(r => !r.storage_path?.startsWith('https://media.top87.id/media/'));

  console.log(`   Total rows : ${rows.length}`);
  console.log(`   Already R2 : ${already.length}`);
  console.log(`   To migrate : ${toMove.length}\n`);

  if (toMove.length === 0) {
    console.log('✅ Nothing to migrate.');
    return;
  }

  const results = { ok: 0, skip: 0, fail: 0 };
  const log = [];

  for (const row of toMove) {
    const { id, storage_path, profile_id } = row;
    if (!storage_path) { results.skip++; log.push({ id, status: 'skip', reason: 'null storage_path' }); continue; }

    let downloadUrl = storage_path;
    if (!downloadUrl.startsWith('http')) {
      // Bare Supabase path — construct public URL
      downloadUrl = `${SUPABASE_URL}/storage/v1/object/public/media/${storage_path}`;
    }

    const ext = extFromUrl(downloadUrl);
    process.stdout.write(`  ${id.slice(0, 8)} ${storage_path.slice(0, 60).padEnd(62)} `);

    if (DRY_RUN) {
      console.log('→ [dry-run]');
      results.ok++;
      log.push({ id, status: 'dry-run', from: downloadUrl });
      continue;
    }

    try {
      const { buffer, contentType } = await downloadBuffer(downloadUrl);
      const userId = profile_id ?? ANON_ID;
      const { url: newUrl } = await uploadToR2(buffer, contentType, userId, ext);
      await updateMediaRow(id, newUrl);
      console.log(`→ ✓ ${newUrl}`);
      results.ok++;
      log.push({ id, status: 'ok', from: downloadUrl, to: newUrl });
    } catch (err) {
      console.log(`→ ✗ ${err.message}`);
      results.fail++;
      log.push({ id, status: 'fail', from: downloadUrl, error: err.message });
    }
  }

  console.log(`\n── Summary ─────────────────────────────────`);
  console.log(`   OK   : ${results.ok}`);
  console.log(`   Skip : ${results.skip}`);
  console.log(`   Fail : ${results.fail}`);

  const csvPath = path.join(__dirname, 'migration-log.csv');
  const csv = ['id,status,from,to,error']
    .concat(log.map(r => `${r.id},${r.status},"${r.from ?? ''}","${r.to ?? ''}","${r.error ?? ''}"`))
    .join('\n');
  fs.writeFileSync(csvPath, csv);
  console.log(`\n   Log saved: ${csvPath}`);

  if (results.fail > 0) {
    console.log('\n⚠️  Some rows failed. Fix errors and re-run (already-migrated rows are skipped automatically).');
    process.exit(1);
  } else {
    console.log('\n✅ Migration complete.');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
