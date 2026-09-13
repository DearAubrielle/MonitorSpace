import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, refreshAccessToken } from './authSession';

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const api = axios.create({
  baseURL: SERVER_URL,
  withCredentials: true,
});

// Add the current access token to every API request.
api.interceptors.request.use((config) => {
  const accessToken = getAccessToken();
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const isLoginRequest = originalRequest?.url?.includes('/api/users/login');

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry || isLoginRequest) {
      throw error;
    }

    originalRequest._retry = true;
    const accessToken = await refreshAccessToken();
    originalRequest.headers.set('Authorization', `Bearer ${accessToken}`);
    return api(originalRequest);
  }
);

export default api;
