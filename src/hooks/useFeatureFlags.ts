import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface FeatureFlags {
  donations: boolean;
  merchandise: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = { donations: false, merchandise: false };

export function useFeatureFlags(): { data: FeatureFlags; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['site_settings', 'feature_flags'],
    queryFn: async (): Promise<FeatureFlags> => {
      const { data: row } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'feature_flags')
        .single();
      if (!row?.value) return DEFAULT_FLAGS;
      try {
        return { ...DEFAULT_FLAGS, ...JSON.parse(row.value) };
      } catch {
        return DEFAULT_FLAGS;
      }
    },
    staleTime: 30_000,
    retry: false,
  });
  return { data: data ?? DEFAULT_FLAGS, isLoading };
}
