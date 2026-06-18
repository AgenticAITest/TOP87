import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface Profile {
  id: string;
  name: string | null;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  city: string | null;
  profession: string | null;
  status: 'pending' | 'approved' | 'suspended' | 'rejected';
  is_super_admin: boolean;
  // Phase 1
  nickname: string | null;
  birthdate: string | null;
  whatsapp: string | null;
  reunion_attendance: 'yes' | 'most_likely' | 'undecided' | 'no' | null;
  reunion_no_reason: string | null;
  funny_event: string | null;
  message_to_friends: string | null;
  tshirt_size: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Track the user id we last fetched a profile for, to avoid redundant fetches
  const fetchingFor = useRef<string | null>(null);

  async function fetchProfile(userId: string): Promise<void> {
    if (fetchingFor.current === userId) return;
    fetchingFor.current = userId;
    try {
      const { data, error } = await Promise.race([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        new Promise<{ data: null; error: { code: string } }>((res) =>
          setTimeout(() => res({ data: null, error: { code: 'timeout' } }), 5000)
        ),
      ]);
      if (error) {
        // PGRST116 = no rows found (new user with no profile yet) → clear profile
        // Anything else (JWT expired, network, timeout) → keep existing profile to avoid flash
        if ((error as any).code === 'PGRST116') setProfile(null);
        return;
      }
      setProfile(data ?? null);
    } finally {
      fetchingFor.current = null;
    }
  }

  async function refreshProfile(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      fetchingFor.current = null; // force re-fetch
      await fetchProfile(session.user.id);
    }
  }

  useEffect(() => {
    let mounted = true;

    // ── Single sequential initialisation ─────────────────────────────────────
    // getSession() is the authoritative source for the initial auth state.
    // We do NOT rely on onAuthStateChange for the initial load to avoid races.
    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch {
        // network error — leave user/profile as null
      } finally {
        if (mounted) setLoading(false);
      }
    }

    // 6-second hard timeout in case getSession hangs (e.g. stuck token refresh)
    const fallback = setTimeout(() => { if (mounted) setLoading(false); }, 6000);

    init().then(() => clearTimeout(fallback));

    // ── Post-init real-time auth changes ──────────────────────────────────────
    // INITIAL_SESSION fires during init — skip it, init() handles that.
    // TOKEN_REFRESHED = JWT renewed, profile data unchanged — skip to avoid flash.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'INITIAL_SESSION') return;
        if (event === 'TOKEN_REFRESHED') return;
        if (!mounted) return;

        setUser(session?.user ?? null);

        if (session?.user) {
          if (event === 'SIGNED_IN') fetchingFor.current = null;
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(fallback);
      subscription.unsubscribe();
    };
  }, []);

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.replace('/');
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
