import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export interface AdminStatus {
  isSuperAdmin: boolean;
  isAdmin: boolean;
  charterIds: string[];   // charters this user admins (empty for super admin — they see all)
  loading: boolean;
}

export function useAdminStatus(): AdminStatus {
  const { user, profile, loading: authLoading } = useAuth();
  const [charterIds, setCharterIds] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (authLoading) return;           // still fetching auth
    if (!user) { setDone(true); return; }  // not signed in
    if (!profile) return;              // signed in but profile not yet loaded — wait
    if (profile.is_super_admin) { setDone(true); return; }

    supabase
      .from('charter_admins')
      .select('charter_id')
      .eq('profile_id', user.id)
      .then(({ data }) => {
        setCharterIds((data ?? []).map((r: any) => r.charter_id));
        setDone(true);
      });
  }, [user, profile, authLoading]);

  const isSuperAdmin = profile?.is_super_admin ?? false;
  const isAdmin = isSuperAdmin || charterIds.length > 0;

  return { isSuperAdmin, isAdmin, charterIds, loading: authLoading || !done };
}
