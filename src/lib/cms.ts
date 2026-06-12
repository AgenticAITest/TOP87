import { supabase } from './supabase';

export type ContentType = 'text' | 'richtext' | 'image_url' | 'json';

/**
 * Fetch all CMS fields for a given page as a flat key map.
 * Keys are `${section_key}.${field_key}`.
 * Returns {} silently when cms_content table doesn't exist yet (dev/pre-migration).
 */
export async function fetchPageContent(pageKey: string): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('cms_content')
    .select('section_key, field_key, value')
    .eq('page_key', pageKey);

  if (error) {
    console.warn('cms_content fetch failed (table may not exist yet):', error.message);
    return {};
  }

  const result: Record<string, string> = {};
  (data ?? []).forEach((row: any) => {
    if (row.value !== null) {
      result[`${row.section_key}.${row.field_key}`] = row.value;
    }
  });
  return result;
}

/**
 * Write or update a single CMS field.
 */
export async function upsertField(
  pageKey: string,
  sectionKey: string,
  fieldKey: string,
  value: string,
  contentType: ContentType = 'text'
): Promise<void> {
  const { error } = await supabase.from('cms_content').upsert(
    {
      page_key: pageKey,
      section_key: sectionKey,
      field_key: fieldKey,
      content_type: contentType,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'page_key,section_key,field_key' }
  );
  if (error) throw error;
}

/**
 * Delete a CMS field so the page falls back to its hardcoded default.
 */
export async function deleteField(
  pageKey: string,
  sectionKey: string,
  fieldKey: string
): Promise<void> {
  const { error } = await supabase
    .from('cms_content')
    .delete()
    .eq('page_key', pageKey)
    .eq('section_key', sectionKey)
    .eq('field_key', fieldKey);
  if (error) throw error;
}
