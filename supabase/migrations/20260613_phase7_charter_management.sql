-- Phase 7.3: Charter Management UI
-- Adds is_active flag to charters and RLS policies for super admin CRUD

ALTER TABLE public.charters
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Super admin: insert new charters
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'charters' AND policyname = 'super_admin_insert_charters'
  ) THEN
    CREATE POLICY "super_admin_insert_charters"
      ON public.charters
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true)
      );
  END IF;
END $$;

-- Super admin: update all charter fields (name, slug, city, country, is_active, etc.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'charters' AND policyname = 'super_admin_update_charters'
  ) THEN
    CREATE POLICY "super_admin_update_charters"
      ON public.charters
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true)
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true)
      );
  END IF;
END $$;

-- Super admin: manage charter_members (add / remove / set primary)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'charter_members' AND policyname = 'super_admin_manage_charter_members'
  ) THEN
    CREATE POLICY "super_admin_manage_charter_members"
      ON public.charter_members
      FOR ALL
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true)
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true)
      );
  END IF;
END $$;
