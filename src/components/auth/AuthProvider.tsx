'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true';

/**
 * Create a mock User object for dev bypass mode
 */
function createMockUser(email: string): User {
  return {
    id: 'dev-user-000',
    aud: 'authenticated',
    role: 'authenticated',
    email,
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    app_metadata: { provider: 'dev-bypass', tenant_id: 'dev-tenant-000' },
    user_metadata: { tenant_id: 'dev-tenant-000', email },
    identities: [],
  };
}

/**
 * Create a mock Session object for dev bypass mode
 */
function createMockSession(email: string): Session {
  const user = createMockUser(email);
  return {
    access_token: 'dev-bypass-token',
    refresh_token: 'dev-bypass-refresh',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user,
  };
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Dev bypass: restore mock session from localStorage
    if (DEV_AUTH_BYPASS) {
      const devEmail = localStorage.getItem('dev-auth-email');
      if (devEmail) {
        const mockSession = createMockSession(devEmail);
        setSession(mockSession);
        setUser(mockSession.user);
      }
      setIsLoading(false);
      return;
    }

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error.message);
        }

        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Unexpected error getting session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithMagicLink = async (email: string) => {
    // Dev bypass: store email and create mock session
    if (DEV_AUTH_BYPASS) {
      localStorage.setItem('dev-auth-email', email);
      const mockSession = createMockSession(email);
      setSession(mockSession);
      setUser(mockSession.user);
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
        },
      });

      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    // Dev bypass: clear localStorage
    if (DEV_AUTH_BYPASS) {
      localStorage.removeItem('dev-auth-email');
      setSession(null);
      setUser(null);
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const refreshSession = async () => {
    // Dev bypass: no-op
    if (DEV_AUTH_BYPASS) return;

    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error refreshing session:', error.message);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
    } catch (error) {
      console.error('Unexpected error refreshing session:', error);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    signInWithMagicLink,
    signOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}
