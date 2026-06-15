import { supabase } from './supabase';

export type StorageBackend = 'supabase' | 'vps' | 'r2';

const VPS_UPLOAD_URL    = 'https://media.top87.id/api/upload';
const VPS_BASE_URL      = 'https://media.top87.id/uploads';
const R2_WORKER_DEFAULT = 'https://media.top87.id';

// Resolve a storage_path to a displayable URL.
// - Full https:// URLs (VPS) are returned as-is.
// - Legacy bare paths are resolved via Supabase public URL.
export function resolveMediaUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;
  if (storagePath.startsWith('https://')) return storagePath;
  return supabase.storage.from('media').getPublicUrl(storagePath).data.publicUrl;
}

export async function getStorageBackend(): Promise<StorageBackend> {
  const { data } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'storage_backend')
    .single();
  return (data?.value as StorageBackend) ?? 'supabase';
}

export async function getR2WorkerUrl(): Promise<string> {
  const { data } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'r2_worker_url')
    .single();
  return data?.value ?? R2_WORKER_DEFAULT;
}

export async function setR2WorkerUrl(url: string): Promise<void> {
  const { error } = await supabase
    .from('site_settings')
    .upsert({ key: 'r2_worker_url', value: url, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function setStorageBackend(backend: StorageBackend): Promise<void> {
  const { error } = await supabase
    .from('site_settings')
    .upsert({ key: 'storage_backend', value: backend, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// Upload a file using the currently active storage backend.
// Returns a storage_path: full URL for VPS/R2, bare path for Supabase.
export async function uploadFile(
  file: File,
  userId: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const backend = await getStorageBackend();
  if (backend === 'vps')  return uploadToVPS(file, userId, onProgress);
  if (backend === 'r2')   return uploadToR2(file, userId, onProgress);
  return uploadToSupabase(file, userId, onProgress);
}

async function uploadToSupabase(
  file: File,
  userId: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const path = `${userId}/${Date.now()}.${ext}`;
  onProgress?.(10);

  const { error } = await Promise.race([
    supabase.storage.from('media').upload(path, file, { contentType: file.type, upsert: false }),
    new Promise<{ error: Error }>((_, reject) =>
      setTimeout(() => reject(new Error('Upload timed out after 60s. Check your connection.')), 60_000)
    ),
  ]);
  if (error) throw new Error(`Storage error: ${(error as Error).message}`);
  onProgress?.(100);
  return path;
}

async function uploadToVPS(
  file: File,
  userId: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('userId', userId);

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', VPS_UPLOAD_URL);
    xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const { url } = JSON.parse(xhr.responseText);
          resolve(url);
        } catch {
          reject(new Error('Invalid response from upload server'));
        }
      } else {
        reject(new Error(`VPS upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    };
    xhr.onerror = () => reject(new Error('VPS upload failed: network error'));
    xhr.send(formData);
  });
}

async function uploadToR2(
  file: File,
  userId: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const workerUrl = await getR2WorkerUrl();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${workerUrl}/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
    xhr.setRequestHeader('X-User-Id', userId);
    xhr.setRequestHeader('X-File-Ext', ext);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const { url } = JSON.parse(xhr.responseText);
          resolve(url);
        } catch {
          reject(new Error('Invalid response from R2 worker'));
        }
      } else {
        reject(new Error(`R2 upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    };
    xhr.onerror = () => reject(new Error('R2 upload failed: network error'));
    xhr.send(file);
  });
}

// Upload a payment receipt — always goes to Supabase Storage under receipts/ prefix.
export async function uploadReceipt(file: File, userId: string): Promise<string> {
  const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${userId}/receipts/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file, {
    contentType: file.type, upsert: false,
  });
  if (error) throw new Error(`Receipt upload failed: ${(error as Error).message}`);
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
}

export { VPS_BASE_URL };
