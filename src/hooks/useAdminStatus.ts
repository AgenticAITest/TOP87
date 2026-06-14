import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export interface AdminStatus {
  isSuperAdmin:   boolean;
  isAdmin:        boolean;
  isFinanceAdmin: boolean;  // has access to bank rekon page
  charterIds:     string[];
  loading:        boolean;
}

export function useAdminStatus(): AdminStatus {
  const { user, profile, loading: authLoading } = useAuth();
  const [charterIds,     setCharterIds]     = useState<string[]>([]);
  const [isFinanceOnly,  setIsFinanceOnly]  = useState(false);
  const [done,           setDone]           = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setDone(true); return; }
    if (!profile) return;
    if (profile.is_super_admin) { setDone(true); return; }

    Promise.all([
      supabase.from('charter_admins').select('charter_id').eq('profile_id', user.id),
      supabase.from('finance_admins').select('profile_id').eq('profile_id', user.id),
    ]).then(([{ data: caData }, { data: faData }]) => {
      setCharterIds((caData ?? []).map((r: any) => r.charter_id));
      setIsFinanceOnly((faData ?? []).length > 0);
      setDone(true);
    });
  }, [user, profile, authLoading]);

  const isSuperAdmin   = profile?.is_super_admin ?? false;
  const isAdmin        = isSuperAdmin || charterIds.length > 0;
  const isFinanceAdmin = isSuperAdmin || isFinanceOnly;

  return { isSuperAdmin, isAdmin, isFinanceAdmin, charterIds, loading: authLoading || !done };
}
