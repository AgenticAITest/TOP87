const WORKER_ORIGIN = 'https://media.top87.id';
const ALLOWED_ORIGIN = 'https://top87.id';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-User-Id, X-File-Ext',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { method } = request;

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (method === 'POST' && url.pathname === '/upload') {
      return handleUpload(request, env);
    }

    if (method === 'GET') {
      return handleGet(request, env, url);
    }

    return new Response('Method Not Allowed', {
      status: 405,
      headers: { ...CORS_HEADERS, Allow: 'GET, POST, OPTIONS' },
    });
  },
};

async function handleUpload(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return json({ error: 'Missing Authorization header' }, 401);
  }

  const token = auth.slice(7);
  const valid = await verifyJWT(token, env.SUPABASE_JWT_SECRET);
  if (!valid) {
    return json({ error: 'Invalid or expired token' }, 401);
  }

  const userId = request.headers.get('X-User-Id') ?? 'anon';
  const ext = (request.headers.get('X-File-Ext') ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const contentType = request.headers.get('Content-Type') ?? 'application/octet-stream';
  const key = `media/${userId}/${Date.now()}.${ext}`;

  try {
    await env.TOP87_BUCKET.put(key, request.body, {
      httpMetadata: { contentType },
    });
  } catch (err) {
    return json({ error: `R2 put failed: ${err.message}` }, 500);
  }

  return json({ url: `${WORKER_ORIGIN}/${key}` }, 200);
}

async function handleGet(request, env, url) {
  const key = url.pathname.replace(/^\//, '');
  if (!key) return new Response('Not Found', { status: 404, headers: CORS_HEADERS });

  const object = await env.TOP87_BUCKET.get(key);
  if (!object) return new Response('Not Found', { status: 404, headers: CORS_HEADERS });

  const cacheControl = key.startsWith('media/')
    ? 'public, max-age=31536000, immutable'
    : key.startsWith('cms/')
      ? 'no-cache, must-revalidate'
      : 'public, max-age=3600';

  const headers = new Headers({
    ...CORS_HEADERS,
    'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
    'ETag': object.httpEtag,
    'Cache-Control': cacheControl,
  });

  return new Response(object.body, { headers });
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

async function verifyJWT(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const [headerB64, payloadB64, sigB64] = parts;

    const keyData = new TextEncoder().encode(secret);
    const key = await crypto.subtle.importKey(
      'raw', keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['verify']
    );

    const sig = base64urlToBuffer(sigB64);
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const valid = await crypto.subtle.verify('HMAC', key, sig, data);
    if (!valid) return false;

    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && payload.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

function base64urlToBuffer(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
