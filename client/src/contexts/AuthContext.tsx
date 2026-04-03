import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types';
import { api, API_URL } from '@/lib/api';

interface AuthContextType {
  user: any | null; // User | null
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: string, department?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const verifyRes = await fetch(`${API_URL}/auth/is-verify`, {
          method: "GET",
          headers: { jwt_token: token }
        });

        const parseRes = await verifyRes.json();

        if (parseRes === true) {
          // Token is valid, get user data
          await fetchUserData(token);
        } else {
          // Invalid token
          setUser(null);
          localStorage.removeItem('token');
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('[AuthContext] checkAuth error:', err.message);
      setUser(null);
      localStorage.removeItem('token');
      setIsLoading(false);
    }
  };

  const fetchUserData = async (token: string) => {
    try {
      console.log('[AuthContext] Fetching user data...');
      const response = await fetch(`${API_URL}/dashboard`, {
        method: "GET",
        headers: { jwt_token: token }
      });

      if (!response.ok) {
        console.error('[AuthContext] Dashboard API error:', response.status);
        throw new Error(`Failed to fetch user data: ${response.status}`);
      }

      const parseRes = await response.json();
      console.log('[AuthContext] Dashboard response:', parseRes);

      const userData = {
        ...parseRes,
        id: parseRes.user_id,
        name: parseRes.name || parseRes.email?.split('@')[0] || 'User',
        role: parseRes.role_name || (parseRes.role_id === 1 ? 'student' : 'admin'),
      };

      console.log('[AuthContext] Setting user:', userData);
      setUser(userData);
      setIsLoading(false);
    } catch (err: any) {
      console.error('[AuthContext] fetchUserData error:', err.message || err);
      setUser(null);
      localStorage.removeItem('token');
      setIsLoading(false);
    }
  }

  const login = async (email: string, password: string, role: string) => {
    setIsLoading(true);
    try {
      console.log('[AuthContext] Logging in...');
      const body = { email, password, role };
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const parseRes = await response.json();
      console.log('[AuthContext] Login response:', parseRes);

      if (parseRes.token && parseRes.user) {
        const actualRole = (parseRes.user.role_name || '').toLowerCase();
        if (actualRole && actualRole !== role.toLowerCase()) {
          throw new Error(`Your account is registered as '${actualRole}'. Please select the correct role.`);
        }
        
        localStorage.setItem("token", parseRes.token);
        await fetchUserData(parseRes.token);
      } else if (parseRes.token) {
        // Fallback if user object isn't returned
        localStorage.setItem("token", parseRes.token);
        await fetchUserData(parseRes.token);
      } else {
        throw new Error(parseRes);
      }
    } catch (err) {
      console.error('[AuthContext] Login error:', err);
      setIsLoading(false);
      throw err;
    }
  };

  const signup = async (name: string, email: string, password: string, role: string, department?: string) => {
    setIsLoading(true);
    try {
      // Map role strings to role_ids
      const roleMap: { [key: string]: number } = {
        'student': 1,
        'tpc': 2,
        'tpf': 3,
        'tpo': 4,
        'principal': 5,
        'admin': 6
      };

      const role_id = roleMap[role] || 1; // Default to student if role not found

      const body = { email, password, name, role_id, department };
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const parseRes = await response.json();

      if (parseRes.token) {
        localStorage.setItem("token", parseRes.token);
        await fetchUserData(parseRes.token);
      } else {
        throw new Error(parseRes);
      }
    } catch (err) {
      console.error(err);
      setIsLoading(false);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
