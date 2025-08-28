import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthUser {
  id: string;
  username: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isPending: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    checkSession();
  }, []);

  const checkSession = async () => {
    setIsPending(true);
    try {
      console.log('Checking session...');
      
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Session check response:', { 
        status: response.status, 
        ok: response.ok 
      });
      
      if (response.ok) {
        const userData = await response.json();
        console.log('Session valid, user data:', userData);
        setUser(userData);
      } else {
        const error = await response.json();
        console.log('Session invalid:', error);
        setUser(null);
      }
    } catch (error) {
      console.error('Session check failed:', error);
      setUser(null);
    } finally {
      setIsPending(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsPending(true);
    try {
      console.log('Attempting login:', { username });
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      console.log('Login response:', { 
        status: response.status, 
        ok: response.ok,
        headers: response.headers
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('Login successful, user data:', userData);
        setUser(userData);
        
        // Verify session immediately after login
        setTimeout(() => checkSession(), 100);
        
        return true;
      } else {
        const error = await response.json();
        console.error('Login failed with error:', error);
      }
      
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      setIsPending(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  const value = {
    user,
    login,
    logout,
    isPending
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useLocalAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useLocalAuth must be used within an AuthProvider');
  }
  return context;
}
