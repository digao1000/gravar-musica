import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { User as AppUser } from '@/shared/types';

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setSession(session);
        
        if (session?.user) {
          // Use setTimeout to prevent potential issues with auth state changes
          setTimeout(async () => {
            try {
              // Fetch user profile from our custom table
              const { data: userData, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();
                
              if (userData && !error) {
                setUser({
                  id: userData.id,
                  name: userData.name,
                  email: userData.email,
                  role: userData.role as 'ADMIN' | 'FUNCIONARIO',
                  is_active: userData.is_active,
                  last_login_at: userData.last_login_at || undefined,
                  created_at: userData.created_at,
                  updated_at: userData.updated_at
                });
              } else {
                setUser(null);
              }
            } catch (error) {
              console.error('Error fetching user data:', error);
              setUser(null);
            }
          }, 0);
        } else {
          setUser(null);
        }
        
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setSession(session);
      
      if (session?.user) {
        // Use setTimeout to prevent potential issues
        setTimeout(async () => {
          try {
            // Fetch user profile from our custom table
            const { data: userData, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();
              
            if (userData && !error) {
              setUser({
                id: userData.id,
                name: userData.name,
                email: userData.email,
                role: userData.role as 'ADMIN' | 'FUNCIONARIO',
                is_active: userData.is_active,
                last_login_at: userData.last_login_at || undefined,
                created_at: userData.created_at,
                updated_at: userData.updated_at
              });
            } else {
              setUser(null);
            }
          } catch (error) {
            console.error('Error fetching initial user data:', error);
            setUser(null);
          }
        }, 0);
      } else {
        setUser(null);
      }
      
      setIsLoading(false);
    }).catch((error) => {
      console.error('Error getting session:', error);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return { error: error.message };
    }

    // Update last login
    if (session?.user) {
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', session.user.id);
    }

    return { error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      login,
      logout,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useSupabaseAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth must be used within an AuthProvider');
  }
  return context;
};