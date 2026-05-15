const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');

const app        = express();
const PORT       = process.env.PORT || 3001;
const UPLOAD_DIR = process.env.UPLOAD_DIR  || '/var/www/media/uploads';
const BASE_URL   = process.env.BASE_URL    || 'https://media.top87.id/uploads';
const SUPABASE_URL      = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars');
  process.exit(1);
}

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Auth middleware ───────────────────────────────────────────────────────────
async function verifyToken(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }
  const token = auth.slice(7);
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON_KEY,
      },
    });
    if (!r.ok) return res.status(401).json({ error: 'Invalid token' });
    const user = await r.json();
    req.userId = user.id;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Auth check failed' });
  }
}

// ── Multer storage ────────────────────────────────────────────────────────────
const ALLOWED_EXT = /\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|mkv|webm|m4v)$/i;

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(UPLOAD_DIR, req.userId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter(req, file, cb) {
    if (ALLOWED_EXT.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${path.extname(file.originalname)}`));
    }
  },
});

// ── Upload endpoint ───────────────────────────────────────────────────────────
app.post('/api/upload', verifyToken, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `${BASE_URL}/${req.userId}/${req.file.filename}`;
  console.log(`[upload] ${req.userId} → ${url}`);
  res.json({ url });
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, '127.0.0.1', () =>
  console.log(`Upload server listening on 127.0.0.1:${PORT}`)
);
