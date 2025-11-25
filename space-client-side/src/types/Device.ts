export interface Device {
  id: number;
  name: string;
  device_type_id: number;
  floorplan_id: number;
  path_topic: string;
  x_percent: number; // 0 to 1
  y_percent: number; // 0 to 1
  latest_value: number;
  last_updated: string;
  min_alert?: number;
  max_alert?: number;
  alert: boolean;
}

export interface DeviceType {
  id: number;
  name: string;
  icon_url: string;
  has_value?: number;
  unit?: string;
}
