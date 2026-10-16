export type AlertDirection = 'above_max' | 'below_min';
export type AlertStatus = 'active' | 'silenced' | 'resolved';

export interface AlertEvent {
  id: number;
  device_id: number;
  device_name: string;
  floorplan_id: number | null;
  device_type_id: number;
  device_type: string;
  icon_url: string | null;
  unit: string | null;
  direction: AlertDirection | null;
  alert_value: number | null;
  threshold_value: number | null;
  status: AlertStatus;
  started_at: string;
  silenced_at: string | null;
  silenced_by_user_id: number | null;
  silenced_by_username: string | null;
  resolved_at: string | null;
}
