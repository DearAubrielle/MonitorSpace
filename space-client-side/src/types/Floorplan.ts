import { Device } from './Device';

export interface Floorplan {
  id: number;
  name: string;
  image_url: string;
  description: string;
  devices: Device[];
}
