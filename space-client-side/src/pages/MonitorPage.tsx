import { useEffect, useState } from 'react';
import MonitorComponent from '../components/MonitorComponent';
import api from '../api/axios';
import type { Device, DeviceType } from '../types/Device';
import { useFloorplan } from '@/context/useFlooplan';

type Camera = {
  id: string;
  name: string;
  streamUrl: string;
  details: string;
};

export default function MonitorPage() {
  const { floorplans } = useFloorplan();

  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCameraDevices = async () => {
      try {
        setLoading(true);

        // Fetch all devices
        const devicesResponse = await api.get('/api/devices/getd');
        const devices: Device[] = devicesResponse.data;

        // Fetch device types to identify cameras
        const typesResponse = await api.get('/api/devices/gettypes');
        const deviceTypes: DeviceType[] = typesResponse.data;

        // Find camera device type
        const cameraType = deviceTypes.find((type) => type.name === 'Camera');

        if (!cameraType) {
          setError('Camera device type not found');
          return;
        }

        // Include every configured camera. Cameras without a stream URL are shown
        // as offline instead of disappearing from the monitoring view.
        const cameraDevices = devices.filter((device) => device.device_type_id === cameraType.id);

        // Transform devices to camera format
        const transformedCameras: Camera[] = cameraDevices.map((device) => {
          const floorplan = floorplans?.find((fp) => fp.id === device.floorplan_id);
          const floorplanName = floorplan ? floorplan.name : `Unknown (ID: ${device.floorplan_id})`;

          return {
            id: device.id.toString(),
            name: device.name,
            streamUrl: device.path_topic?.trim() ?? '',
            details: floorplanName,
          };
        });

        setCameras(transformedCameras);
        setError(null);
      } catch (err) {
        console.error('Error fetching camera devices:', err);
        setError('Failed to load camera devices');
      } finally {
        setLoading(false);
      }
    };

    fetchCameraDevices();
  }, [floorplans]);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading cameras...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        <p>Error: {error}</p>
      </div>
    );
  }

  if (cameras.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>No camera devices found. Add a camera in the devices section to begin monitoring.</p>
      </div>
    );
  }

  return <MonitorComponent cameras={cameras} />;
}
