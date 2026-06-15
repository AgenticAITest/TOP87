const WORKER_ORIGIN = 'https://media.top87.id';

const ALLOWED_ORIGINS = [
  'https://top87.id',
  'https://www.top87.id',
  'http://localhost:3000',
  'http://localhost:5173',
];

function corsHeaders(request) {
  const origin = request.headers.get('Origin') ?? '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-User-Id, X-File-Ext',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, status, ch) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...ch, 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { method } = request;
    const ch = corsHeaders(request);

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: ch });
    }

    if (method === 'POST' && url.pathname === '/upload') {
      const auth = request.headers.get('Authorization');
      if (!auth?.startsWith('Bearer ')) {
        return json({ error: 'Missing Authorization header' }, 401, ch);
      }

      const token = auth.slice(7);
      const valid = await verifyJWT(token, env);
      if (!valid) {
        return json({ error: 'Invalid or expired token' }, 401, ch);
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
        return json({ error: `R2 put failed: ${err.message}` }, 500, ch);
      }

      return json({ url: `${WORKER_ORIGIN}/${key}` }, 200, ch);
    }

    if (method === 'GET') {
      const key = url.pathname.replace(/^\//, '');
      if (!key) return new Response('Not Found', { status: 404, headers: ch });

      const object = await env.TOP87_BUCKET.get(key);
      if (!object) return new Response('Not Found', { status: 404, headers: ch });

      const cacheControl = key.startsWith('media/')
        ? 'public, max-age=31536000, immutable'
        : key.startsWith('cms/')
          ? 'no-cache, must-revalidate'
          : 'public, max-age=3600';

      const headers = new Headers({
        ...ch,
        'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
        'ETag': object.httpEtag,
        'Cache-Control': cacheControl,
      });

      return new Response(object.body, { headers });
    }

    return new Response('Method Not Allowed', {
      status: 405,
      headers: { ...ch, Allow: 'GET, POST, OPTIONS' },
    });
  },
};

async function verifyJWT(token, env) {
  try {
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.SUPABASE_ANON_KEY,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}
