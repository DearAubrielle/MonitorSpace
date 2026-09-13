import { useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../api/axios';
import {
  AUTH_SESSION_EXPIRED_EVENT,
  AUTH_TOKEN_REFRESHED_EVENT,
  refreshAccessToken,
} from '../api/authSession';
import { AuthContext, AuthContextType, DecodedToken } from './AuthContext';

interface AuthProviderProps {
  children: ReactNode;
}

// --- Provider Component ---

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(() => {
    const storedToken = localStorage.getItem('accessToken');
    if (storedToken) {
      try {
        const decoded = jwtDecode<DecodedToken>(storedToken);
        // Check if token is expired
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem('accessToken');
          return null;
        }
        return storedToken;
      } catch {
        localStorage.removeItem('accessToken');
        return null;
      }
    }
    return null;
  });

  const [role, setRole] = useState<string | null>(() => {
    const storedToken = localStorage.getItem('accessToken');
    if (storedToken) {
      try {
        const decoded = jwtDecode<DecodedToken>(storedToken);
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          return null;
        }
        return decoded.role;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [user, setUser] = useState<DecodedToken | null>(() => {
    const storedToken = localStorage.getItem('accessToken');
    if (storedToken) {
      try {
        const decoded = jwtDecode<DecodedToken>(storedToken);
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          return null;
        }
        return decoded;
      } catch {
        return null;
      }
    }
    return null;
  });

  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const applyAccessToken = useCallback((accessToken: string) => {
    const decoded = jwtDecode<DecodedToken>(accessToken);
    localStorage.setItem('accessToken', accessToken);
    setToken(accessToken);
    setUser(decoded);
    setRole(decoded.role);
  }, []);

  const clearAuthentication = useCallback(() => {
    setToken(null);
    setRole(null);
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('username');

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      // Call logout endpoint to clear refresh token on server
      await api.post('/api/users/logout');
    } catch {
      console.warn('Server logout failed; local authentication state was cleared.');
    } finally {
      clearAuthentication();
    }
  }, [clearAuthentication]);

  const refresh = useCallback(async (): Promise<void> => {
    const accessToken = await refreshAccessToken();
    applyAccessToken(accessToken);
  }, [applyAccessToken]);

  // Refresh the access token shortly before it expires.
  const scheduleRefresh = useCallback(
    (token: string) => {
      try {
        const decoded = jwtDecode<DecodedToken>(token);
        if (decoded.exp) {
          const expirationTime = decoded.exp * 1000; // Convert to milliseconds
          const currentTime = Date.now();
          const timeUntilExpiration = expirationTime - currentTime;

          // Clear existing timeout
          if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
          }

          const refreshTime = Math.max(0, timeUntilExpiration - 5 * 60 * 1000);

          refreshTimeoutRef.current = setTimeout(() => {
            refresh().catch(() => {
              // The API client clears authentication and emits a session-expired event.
            });
          }, refreshTime);

          console.log(`Token expires in ${Math.floor(timeUntilExpiration / 1000 / 60)} minutes`);
        }
      } catch (error) {
        console.error('Error scheduling logout:', error);
      }
    },
    [refresh]
  );

  useEffect(() => {
    const handleTokenRefreshed = (event: Event) => {
      const accessToken = (event as CustomEvent<string>).detail;
      if (accessToken) applyAccessToken(accessToken);
    };
    const handleSessionExpired = () => clearAuthentication();

    window.addEventListener(AUTH_TOKEN_REFRESHED_EVENT, handleTokenRefreshed);
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => {
      window.removeEventListener(AUTH_TOKEN_REFRESHED_EVENT, handleTokenRefreshed);
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [applyAccessToken, clearAuthentication]);

  useEffect(() => {
    if (token) {
      scheduleRefresh(token);
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [token, scheduleRefresh]);

  async function login(username: string, password: string): Promise<void> {
    try {
      const res = await api.post('/api/users/login', { username, password });
      const accessToken = res.data.accessToken as string;
      applyAccessToken(accessToken);
    } catch (error) {
      // Optionally, handle error more gracefully
      console.error('Login failed:', error);
      throw error;
    }
  }

  const authContextValue: AuthContextType = {
    token,
    user,
    role,
    login,
    refresh,
    logout,
  };

  return <AuthContext value={authContextValue}>{children}</AuthContext>;
}
