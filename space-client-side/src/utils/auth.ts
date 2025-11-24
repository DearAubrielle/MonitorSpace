// src/services/authService.ts
import { jwtDecode } from 'jwt-decode';

interface TokenPayload {
  id: string;
  username: string;
  role: string;
  exp?: number;
}

export function getToken() {
  return localStorage.getItem('token');
}

export function setToken(token: string) {
  localStorage.setItem('token', token);
}

export function clearToken() {
  localStorage.removeItem('token');
}

export function decodeToken(): TokenPayload | null {
  const token = getToken();
  if (!token) return null;

  try {
    return jwtDecode<TokenPayload>(token);
  } catch {
    return null;
  }
}

export function isTokenExpired(): boolean {
  const decoded = decodeToken();
  if (!decoded || !decoded.exp) return true;

  const now = Date.now() / 1000;
  return decoded.exp < now;
}

export function getUserRole(): string | null {
  const decoded = decodeToken();
  return decoded?.role ?? null;
}
