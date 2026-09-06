import { createContext } from 'react';

// --- Define Types ---
export interface DecodedToken {
  username: string;
  role: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown; // in case your token contains other fields
}

export interface AuthContextType {
  token: string | null;
  user: DecodedToken | null;
  role: string | null;
  login: (username: string, password: string) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
