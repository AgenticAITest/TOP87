import { useQuery } from '@tanstack/react-query';
import { qk, getDashboardCards, DEFAULT_DASHBOARD_CARDS, type DashboardCardId } from '../lib/queries';

/**
 * Which three KPI cards the member dashboard shows, and in what order.
 * Admin-managed in Site Settings (site_settings.dashboard_cards); falls back to the original
 * three so the dashboard renders correctly before the row exists or if the read fails.
 */
export function useDashboardCards(): { data: DashboardCardId[]; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: qk.dashboardCards(),
    queryFn:  getDashboardCards,
    staleTime: 30_000,
    retry: false,
  });
  return { data: data ?? DEFAULT_DASHBOARD_CARDS, isLoading };
}
