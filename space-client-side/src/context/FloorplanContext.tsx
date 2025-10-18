import { createContext } from "react";
import { Floorplan } from "../types/Floorplan";
import { Device , DeviceType } from "../types/Device";

export interface FloorplanContextType {
  floorplans: Floorplan[] | null;
  selected: Floorplan | null;
  setSelected: (f: Floorplan) => void;
  devices: Device[] | null;
  setDevices: React.Dispatch<React.SetStateAction<Device[] | null>>;
  deviceTypes: DeviceType[] | null;
  setDeviceTypes: React.Dispatch<React.SetStateAction<DeviceType[] | null>>;
  refreshDevices: () => Promise<void>;
  refreshFloorplans: () => Promise<void>;
}

export const FloorplanContext = createContext<FloorplanContextType | undefined>(undefined);
  