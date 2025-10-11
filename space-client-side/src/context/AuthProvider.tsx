import { useState, ReactNode } from "react";
import { jwtDecode } from "jwt-decode";
import api from "../api/axios";
import { AuthContext, AuthContextType  } from "./AuthContext";

// --- Define Types ---
interface DecodedToken {
  role: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown; // in case your token contains other fields
}



interface AuthProviderProps {
  children: ReactNode;
}


// --- Provider Component ---
export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("accessToken"));
  const [role, setRole] = useState<string | null>(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      const decoded = jwtDecode<DecodedToken>(token);
      return decoded.role;
    }
    return null;
  });

  async function login(username: string, password: string): Promise<void> {
    try {
      const res = await api.post("/api/users/login", { username, password });
      const accessToken = res.data.accessToken as string;
      setToken(accessToken);
      localStorage.setItem("accessToken", accessToken); // Persist token securely

      const decoded = jwtDecode<DecodedToken>(accessToken);
      setRole(decoded.role);
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
    setRole(decoded.role);
  }

  function logout(): void {
    setToken(null);
    setRole(null);
  }

  const authContextValue: AuthContextType = {
    token,
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
