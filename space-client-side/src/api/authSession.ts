import axios from 'axios';

const SERVER_URL = import.meta.env.VITE_SERVER_URL;
const ACCESS_TOKEN_KEY = 'accessToken';

export const AUTH_TOKEN_REFRESHED_EVENT = 'auth:token-refreshed';
export const AUTH_SESSION_EXPIRED_EVENT = 'auth:session-expired';

const refreshClient = axios.create({
  baseURL: SERVER_URL,
  withCredentials: true,
});

let activeRefresh: Promise<string> | null = null;

export const getAccessToken = (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY);

const saveAccessToken = (accessToken: string) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  window.dispatchEvent(new CustomEvent<string>(AUTH_TOKEN_REFRESHED_EVENT, { detail: accessToken }));
};

const clearAccessToken = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
};

// Concurrent requests share this promise, so only one token refresh runs at a time.
export const refreshAccessToken = (): Promise<string> => {
  if (!activeRefresh) {
    activeRefresh = refreshClient
      .post<{ accessToken: string }>('/api/users/refresh-token')
      .then((response) => {
        const accessToken = response.data.accessToken;
        saveAccessToken(accessToken);
        return accessToken;
      })
      .catch((error) => {
        clearAccessToken();
        throw error;
      })
      .finally(() => {
        activeRefresh = null;
      });
  }

  return activeRefresh;
};
