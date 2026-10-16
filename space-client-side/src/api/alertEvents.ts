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
