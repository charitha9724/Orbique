import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

export type Profile = {
  id: string;
  display_name: string;
  city: string | null;
  avatar_url: string | null;
  /** Rounded map position of the person's area (about 1 km), or null before they pick one. */
  lat: number | null;
  lng: number | null;
  /** Area name such as "Koramangala, Bengaluru". */
  area: string | null;
  /** How far away listings can be: 5, 10 or 25 km. */
  radius_km: number;
};

type AuthState = {
  /** The logged-in session, or null when logged out. */
  session: Session | null;
  /** The logged-in user's profile row, or null if not loaded yet. */
  profile: Profile | null;
  /** True until we know whether someone is logged in (and their profile is loaded). */
  loading: boolean;
  /** Set when the profile could not be loaded (for example, the database setup is missing). */
  profileError: string | null;
  /** Load the profile again after changing it. */
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function fetchProfile(id: string): Promise<{ profile: Profile | null; error: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, city, avatar_url, lat, lng, area, radius_km')
    .eq('id', id)
    .maybeSingle();
  if (error) return { profile: null, error: error.message };
  if (!data) return { profile: null, error: 'Your profile was not found. Has the database setup been run in Supabase?' };
  return { profile: data as Profile, error: null };
}

// Keeps track of who is logged in, and shares it with every screen.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  // The last profile we loaded, and for which user (so a stale one is never shown).
  const [loaded, setLoaded] = useState<{ userId: string; profile: Profile | null; error: string | null } | null>(
    null,
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  const loadProfile = useCallback(async (id: string) => {
    const result = await fetchProfile(id);
    setLoaded({ userId: id, ...result });
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    fetchProfile(userId).then((result) => {
      if (active) setLoaded({ userId, ...result });
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const refreshProfile = useCallback(async () => {
    if (userId) await loadProfile(userId);
  }, [userId, loadProfile]);

  const current = userId && loaded?.userId === userId ? loaded : null;
  const profile = current?.profile ?? null;
  const profileError = current?.error ?? null;
  const loading = sessionLoading || (!!userId && !current);

  return (
    <AuthContext.Provider value={{ session, profile, loading, profileError, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
