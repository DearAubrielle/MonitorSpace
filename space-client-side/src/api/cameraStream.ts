import api from './axios';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;

type StreamTokenResponse = {
  streamPath: string;
  expiresInSeconds: number;
};

export async function getCameraStreamUrl(deviceId: string | number): Promise<string> {
  const response = await api.get<StreamTokenResponse>(`/api/devices/${deviceId}/stream-token`);
  return new URL(response.data.streamPath, SERVER_URL).toString();
}
