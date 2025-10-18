import api from '../api/axios';
import { FloorplanContext, FloorplanContextType } from './FloorplanContext';
import { ReactNode, useState, useEffect, useCallback } from 'react';
import { Floorplan } from '../types/Floorplan';
import { Device, DeviceType } from '../types/Device';

interface FloorplanProviderProps {
  children: ReactNode;
}
export function FloorplanProvider({ children }: FloorplanProviderProps) {
  const [floorplans, setFloorplans] = useState<Floorplan[] | null>(null);
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [selected, setSelected] = useState<Floorplan | null>(null);
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[] | null>(null);

  const refreshFloorplans = useCallback(async () => {
    try {
      const res = await api.get('/api/floorplans/getf');
      setFloorplans(res.data);
      if (res.data.length > 0 && !selected) setSelected(res.data[0]);
    } catch (error) {
      console.error('Error fetching floorplans:', error);
    }
  }, [selected]);

  const refreshDevices = useCallback(async () => {
    try {
      const res = await api.get('/api/devices/getd');
      setDevices(res.data);
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  }, []);

  const refreshDeviceTypes = useCallback(async () => {
    try {
      const res = await api.get('/api/devices/gettypes');
      setDeviceTypes(res.data);
    } catch (error) {
      console.error('Error fetching device types:', error);
    }
  }, []);

  useEffect(() => {
    refreshFloorplans();
    refreshDevices();
    refreshDeviceTypes();
  }, [refreshFloorplans, refreshDevices, refreshDeviceTypes]);

  const contextValue: FloorplanContextType = {
    floorplans,
    selected,
    setSelected,
    devices,
    setDevices,
    deviceTypes,
    setDeviceTypes,
    refreshDevices,
    refreshFloorplans,
  };

  return (
    <FloorplanContext.Provider value={contextValue}>
      {children}
    </FloorplanContext.Provider>
  );
}
