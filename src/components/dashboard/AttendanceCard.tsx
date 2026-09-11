import { Link } from 'react-router-dom';
import { Users, ArrowRight } from 'lucide-react';
import type { AttendanceBreakdown } from '../../hooks/useDashboardData';

interface Props {
  confirmedCount:   number;
  attendanceTarget: number;
  attendancePct:    number;
  quotaTarget:      number;
  minimumMet:       boolean;
  attendance:       AttendanceBreakdown | undefined;
  isApproved:       boolean;
}

/** "Kehadiran Alumni" — confirmed attendance against the quota + intent breakdown. */
export default function AttendanceCard({
  confirmedCount, attendanceTarget, attendancePct, quotaTarget, minimumMet, attendance, isApproved,
}: Props) {
  return (
    <div className="glass-card p-6 rounded-xl shadow-sm">
      <div className="flex items-center mb-4">
        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded text-green-700 dark:text-green-400 mr-3">
          <Users className="w-5 h-5" />
        </div>
        <h3 className="font-bold text-gray-800 dark:text-gray-200">Kehadiran Alumni</h3>
      </div>
      <div className="flex items-end justify-between mb-2">
        <div className="flex items-baseline">
          <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">{confirmedCount}</span>
          <span className="text-gray-500 dark:text-gray-400 text-lg mx-1">/</span>
          <span className="text-xl text-gray-500 dark:text-gray-400">{attendanceTarget}</span>
          <span className="ml-2 text-sm text-gray-400 dark:text-gray-500">Alumni</span>
        </div>
        <span className="text-2xl font-bold text-green-600 dark:text-green-400">{attendancePct}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
        <div
          className="bg-green-600 h-2 rounded-full transition-all"
          style={{ width: `${attendancePct}%` }}
        />
      </div>
      <p className="text-[11px] text-gray-600 dark:text-gray-400 mb-3">
        {minimumMet
          ? `Kuota minimum ${quotaTarget} tercapai ✓ — menuju target ${attendanceTarget}`
          : `Butuh ${quotaTarget - confirmedCount} lagi untuk kuota minimum (${quotaTarget})`}
      </p>

      {/* Attendance intent breakdown */}
      {attendance && (
        <div className="grid grid-cols-3 gap-1 mb-4 bg-amber-50/60 dark:bg-amber-900/10 rounded-lg p-2 border border-amber-100 dark:border-amber-800/20">
          <div className="text-center">
            <p className="text-sm font-bold text-green-700 dark:text-green-400">{attendance.yes}</p>
            <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-tight">Hadir</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-yellow-600 dark:text-yellow-400">{attendance.undecided}</p>
            <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-tight">Belum Tahu</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-red-500">{attendance.no}</p>
            <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-tight">Tidak Bisa</p>
          </div>
        </div>
      )}

      {isApproved ? (
        <Link
          to="/profile"
          className="w-full py-2 rounded text-sm font-bold flex items-center justify-center gap-2 bg-green-600/80 hover:bg-green-600 text-white transition-colors"
        >
          ✓ Sudah Terdaftar
        </Link>
      ) : (
        <Link
          to="/register"
          className="btn-primary w-full py-2 rounded text-sm font-bold flex items-center justify-center gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          Daftar Sekarang
        </Link>
      )}
    </div>
  );
}
