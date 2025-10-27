import { useState, ReactNode, useEffect, useRef, useCallback } from "react";
import { jwtDecode } from "jwt-decode";
import api from "../api/axios";
import { AuthContext, AuthContextType, DecodedToken} from "./AuthContext";



interface AuthProviderProps {
  children: ReactNode;
}


// --- Provider Component ---

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(() => {
    const storedToken = localStorage.getItem("accessToken");
    if (storedToken) {
      try {
        const decoded = jwtDecode<DecodedToken>(storedToken);
        // Check if token is expired
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem("accessToken");
          return null;
        }
        return storedToken;
      } catch {
        localStorage.removeItem("accessToken");
        return null;
      }
    }
    return null;
  });

  const [role, setRole] = useState<string | null>(() => {
    const storedToken = localStorage.getItem("accessToken");
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
    const storedToken = localStorage.getItem("accessToken");
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

  const logoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      // Call logout endpoint to clear refresh token on server
      await api.post("/api/users/logout");
    } catch (error) {
      console.warn("Failed to logout on server:", error);
    } finally {
      // Clear client-side data regardless of server response
      setToken(null);
      setRole(null);
      setUser(null);
      localStorage.removeItem("accessToken");
      
      // Clear logout timeout
      if (logoutTimeoutRef.current) {
        clearTimeout(logoutTimeoutRef.current);
        logoutTimeoutRef.current = null;
      }
      
      console.log("User logged out successfully");
    }
  }, []);

  // Check token expiration and set auto-logout
  const scheduleLogout = useCallback((token: string) => {
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      if (decoded.exp) {
        const expirationTime = decoded.exp * 1000; // Convert to milliseconds
        const currentTime = Date.now();
        const timeUntilExpiration = expirationTime - currentTime;

        // Clear existing timeout
        if (logoutTimeoutRef.current) {
          clearTimeout(logoutTimeoutRef.current);
        }

        // Schedule logout before token expires (5 minutes early)
        const logoutTime = Math.max(0, timeUntilExpiration - 5 * 60 * 1000);
        
        logoutTimeoutRef.current = setTimeout(() => {
          console.log("Token expired, logging out...");
          logout();
        }, logoutTime);

        console.log(`Token expires in ${Math.floor(timeUntilExpiration / 1000 / 60)} minutes`);
      }
    } catch (error) {
      console.error("Error scheduling logout:", error);
    }
  }, [logout]);

  // Check for token expiration on mount
  useEffect(() => {
    if (token) {
      scheduleLogout(token);
    }

    return () => {
      if (logoutTimeoutRef.current) {
        clearTimeout(logoutTimeoutRef.current);
      }
    };
  }, [token, scheduleLogout]);

  async function login(username: string, password: string): Promise<void> {
    try {
      const res = await api.post("/api/users/login", { username, password });
      const accessToken = res.data.accessToken as string;
      setToken(accessToken);
      localStorage.setItem("accessToken", accessToken); // Persist token securely

      const decoded = jwtDecode<DecodedToken>(accessToken);
      
      // Schedule auto-logout
      scheduleLogout(accessToken);
      
      // Fetch user profile with permissions
      try {
        const profileRes = await api.get("/api/users/profile", {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const userWithPermissions = {
          ...decoded,
          permissions: profileRes.data.permissions
        };
        setUser(userWithPermissions);
        setRole(decoded.role);
      } catch (profileError) {
        console.warn("Failed to fetch user permissions:", profileError);
        setRole(decoded.role);
        setUser(decoded);
      }
    } catch (error) {
      // Optionally, handle error more gracefully
      console.error("Login failed:", error);
      throw error;
    }
  }

  async function refresh(): Promise<void> {
    const res = await api.post("/api/users/refresh");
    const accessToken = res.data.accessToken as string;
    setToken(accessToken);

    const decoded = jwtDecode<DecodedToken>(accessToken);
    
    // Schedule auto-logout for refresh token
    scheduleLogout(accessToken);
    
    // Fetch user profile with permissions
    try {
      const profileRes = await api.get("/api/users/profile", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const userWithPermissions = {
        ...decoded,
        permissions: profileRes.data.permissions
      };
      setUser(userWithPermissions);
      setRole(decoded.role);
    } catch (profileError) {
      console.warn("Failed to fetch user permissions:", profileError);
      setRole(decoded.role);
      setUser(decoded);
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
  
  console.log("AuthContext Value:", authContextValue);
  return (
    <AuthContext value={authContextValue}>
      {children}
    </AuthContext>
  );
}
