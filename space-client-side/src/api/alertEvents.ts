import api from './axios';
import type { AlertEvent, AlertStatus } from '../types/AlertEvent';

export type AlertDays = 7 | 30 | 90 | 'all';

export async function getAlertEvents(
  days: AlertDays,
  options: { status?: AlertStatus; signal?: AbortSignal } = {}
): Promise<AlertEvent[]> {
  const response = await api.get<AlertEvent[]>('/api/alert-events', {
    params: { days, status: options.status },
    signal: options.signal,
  });

  return response.data;
}

export interface SilenceAlertEventResponse {
  id: number;
  status: 'silenced';
  silenced_by_user_id: number;
  silenced_by_username: string | null;
}

export async function silenceAlertEvent(alertEventId: number): Promise<SilenceAlertEventResponse> {
  const response = await api.patch<SilenceAlertEventResponse>(`/api/alert-events/${alertEventId}/silence`);

  return response.data;
}
