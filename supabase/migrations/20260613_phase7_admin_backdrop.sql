-- Phase 7.4: Admin Panel Backdrop
-- Seed default site_settings keys for backdrop URL and overlay opacity

INSERT INTO public.site_settings (key, value)
VALUES
  ('admin_backdrop_url',     ''),
  ('admin_backdrop_opacity', '15')
ON CONFLICT (key) DO NOTHING;
