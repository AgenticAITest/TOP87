import { useQuery } from '@tanstack/react-query';
import { fetchPageContent } from '../lib/cms';

export function usePageContent(pageKey: string) {
  return useQuery({
    queryKey: ['cms', pageKey],
    queryFn: () => fetchPageContent(pageKey),
    staleTime: 5 * 60_000,
    retry: false,
  });
}
