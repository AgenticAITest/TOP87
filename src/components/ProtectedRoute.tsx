import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  children: ReactNode;
  requireApproved?: boolean;
}

function Loading() {
  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center">
      <p className="text-gold/50 text-xs uppercase tracking-widest animate-pulse">Loading…</p>
    </div>
  );
}

export default function ProtectedRoute({ children, requireApproved = false }: Props) {
  const { user, profile, loading } = useAuth();

  // Auth still initialising
  if (loading) return <Loading />;

  // Not signed in
  if (!user) return <Navigate to="/" replace />;

  // Signed in but profile not yet loaded (fetchProfile still in flight or failed briefly)
  // Show loading instead of redirecting — avoids false /pending redirects
  if (!profile) return <Loading />;

  // Signed in, profile loaded — check registration completeness.
  // Only force the registration form for members who haven't been approved yet;
  // an approved member with a blank city fixes their details on /profile instead
  // of being bounced into the "Submit for Approval" flow.
  if (!profile.city && profile.status !== 'approved') return <Navigate to="/register" replace />;

  // Approved-only routes
  if (requireApproved && profile.status !== 'approved') {
    return <Navigate to="/pending" replace />;
  }

  return <>{children}</>;
}
