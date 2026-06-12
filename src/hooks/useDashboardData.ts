import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { fetchPaymentTotals, fetchMerchandiseTotals, fetchMerchandiseItems, fetchMerchandiseMargin, fetchLatestComment, fetchBudgetTarget } from '../lib/queries';
import type { MerchandiseItem } from '../lib/queries';

export interface AttendanceBreakdown {
  yes: number;
  most_likely: number;
  undecided: number;
  no: number;
}

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
  attendance: AttendanceBreakdown;
  totalDana: { reunion_fee: number; donation: number; merchandise_margin: number };
  merchandiseTotals: { confirmed: number; pending: number };
  topMerchandise: MerchandiseItem[];
  latestComment: { body: string; profileName: string } | null;
  budgetTarget: number;
}

export function useDashboardData() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard', 'member'],
    queryFn: async (): Promise<DashboardData> => {
      const [
        countRes,
        recentRes,
        mediaRes,
        attendanceRes,
        paymentTotals,
        merchandiseTotals,
        topMerchandise,
        merchandiseMargin,
        latestComment,
        budgetTarget,
      ] = await Promise.all([
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
        supabase
          .from('profiles')
          .select('reunion_attendance')
          .eq('status', 'approved')
          .not('reunion_attendance', 'is', null),
        fetchPaymentTotals().catch(() => ({ reunion_fee: 0, donation: 0 })),
        fetchMerchandiseTotals().catch(() => ({ confirmed: 0, pending: 0 })),
        fetchMerchandiseItems().catch(() => [] as MerchandiseItem[]),
        fetchMerchandiseMargin().catch(() => 0),
        fetchLatestComment().catch(() => null),
        fetchBudgetTarget().catch(() => 247_000_000),
      ]);

      const attendance: AttendanceBreakdown = { yes: 0, most_likely: 0, undecided: 0, no: 0 };
      (attendanceRes.data ?? []).forEach((p: any) => {
        const v = p.reunion_attendance as string;
        if (v in attendance) attendance[v as keyof AttendanceBreakdown]++;
      });

      return {
        approvedCount:     countRes.count ?? 0,
        recentMembers:     (recentRes.data ?? []) as DashboardData['recentMembers'],
        galleryMedia:      (mediaRes.data  ?? []) as DashboardData['galleryMedia'],
        attendance,
        totalDana:         { ...paymentTotals, merchandise_margin: merchandiseMargin },
        merchandiseTotals,
        topMerchandise:    topMerchandise.slice(0, 3),
        latestComment,
        budgetTarget,
      };
    },
    staleTime: 2 * 60_000,
  });
}
