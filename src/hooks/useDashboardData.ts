import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface DashboardData {
  approvedCount: number;
  recentMembers: Array<{
    id: string;
    name: string;
    avatar_url: string | null;
    created_at: string;
  }>;
  galleryMedia: Array<{
    id: string;
    storage_path: string | null;
    external_url: string | null;
    caption: string | null;
  }>;
}

export function useDashboardData() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard', 'member'],
    queryFn: async (): Promise<DashboardData> => {
      const [countRes, recentRes, mediaRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved'),
        supabase
          .from('profiles')
          .select('id, name, avatar_url, created_at')
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('media')
          .select('id, storage_path, external_url, caption')
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(4),
      ]);

      return {
        approvedCount: countRes.count ?? 0,
        recentMembers: (recentRes.data ?? []) as DashboardData['recentMembers'],
        galleryMedia: (mediaRes.data ?? []) as DashboardData['galleryMedia'],
      };
    },
    staleTime: 2 * 60_000,
  });
}
