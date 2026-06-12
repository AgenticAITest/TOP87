import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { navigate('/'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('city, status, is_super_admin')
        .eq('id', session.user.id)
        .single();

      if (profile?.is_super_admin) {
        navigate('/admin');
      } else if (!profile?.city) {
        navigate('/register');
      } else if (profile.status === 'approved') {
        navigate('/home');
      } else {
        navigate('/pending');
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center">
      <p className="text-gold/50 text-xs uppercase tracking-widest animate-pulse">Signing you in…</p>
    </div>
  );
}
